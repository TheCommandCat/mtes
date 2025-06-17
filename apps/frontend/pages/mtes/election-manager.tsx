import { useEffect, useState, useMemo } from 'react';
import { enqueueSnackbar } from 'notistack';
import { useRouter } from 'next/router';
import { GetServerSideProps, NextPage } from 'next';
import { WithId } from 'mongodb';
import {
  Paper,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Tabs,
  Tab
} from '@mui/material';
import {
  ElectionEvent,
  ElectionState,
  Member,
  Round,
  SafeUser,
  VotingStates,
  VotingStatus
} from '@mtes/types';
import Layout from '../../components/layout';
import { RoleAuthorizer } from '../../components/role-authorizer';
import { useWebsocket } from '../../hooks/use-websocket';
import { apiFetch, getUserAndDivision, serverSideGetRequests } from '../../lib/utils/fetch';
import { ControlRounds } from '../../components/mtes/control-rounds';
import { MembersGrid } from '../../components/mtes/members-grid';
import { RoundResults } from '../../components/mtes/round-results';
import { VotingStatus as VotingStatusComponent } from '../../components/mtes/voting-status';
import { RoundHeader } from '../../components/mtes/round-header';
import { RoundPreview } from '../../components/mtes/round-preview';
import { VotingStandsGrid } from '../../components/mtes/voting-stands-grid';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { localizedRoles } from 'apps/frontend/localization/roles';
import AddRoundDialog from '../../components/mtes/add-round-dialog';
import { MemberPresenceStatus } from '../../components/mtes/member-presence-status'; // Changed to named import
import MemberPresence from '../../components/mtes/member-presence'; // Added import

interface Props {
  user: WithId<SafeUser>;
  members: WithId<Member>[];
  mmMembers: WithId<Member>[];
  rounds: WithId<Round>[];
  electionState: WithId<ElectionState>;
  event: ElectionEvent;
}

const initialRoundStatuses = (
  numofStands: number,
  status: VotingStates
): Record<number, VotingStandStatus> =>
  Object.fromEntries(
    Array.from({ length: numofStands }, (_, i) => [i + 1, { status: status, member: null }])
  ) as Record<number, VotingStandStatus>;

interface VotingStandStatus {
  status: VotingStates;
  member: WithId<Member> | null;
}

const Page: NextPage<Props> = ({
  user,
  members: initialMembers,
  mmMembers: initialMMMembers,
  rounds,
  electionState,
  event
}) => {
  const router = useRouter();
  const [members, setMembers] = useState<WithId<Member>[]>(initialMembers);
  const [mmMembers, setMMMembers] = useState<WithId<Member>[]>(initialMMMembers); // Added state for MM Members
  const [selectedRound, setSelectedRound] = useState<WithId<Round> | null>(null);
  const [activeRound, setActiveRound] = useState<WithId<Round> | null>(
    electionState.activeRound || null
  );
  const [isRoundLocked, setIsRoundLocked] = useState(false);
  const [roundResults, setRoundResults] = useState<any>(null);
  const [standStatuses, setStandStatuses] = useState<Record<number, VotingStandStatus>>(
    initialRoundStatuses(event.votingStands, event == null ? 'NotStarted' : 'Empty')
  );
  const [votedMembers, setVotedMembers] = useState<WithId<VotingStatus>[]>([]);
  const [roundToDelete, setRoundToDelete] = useState<WithId<Round> | null>(null);
  const [currentTab, setCurrentTab] = useState(0);

  const presentMembersCount = useMemo(() => {
    const regularPresent = members.filter(m => m.isPresent).length;
    const mmPresent = mmMembers.filter(m => m.isPresent).length;
    return regularPresent + mmPresent;
  }, [members, mmMembers]);

  const allMembersForPresence = useMemo(() => [...members, ...mmMembers], [members, mmMembers]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const refreshVotedMembers = async (roundId: string) => {
    const response = await apiFetch(`/api/events/votedMembers/${roundId}`, {
      method: 'GET'
    });
    if (response.ok) {
      const data = await response.json();
      setVotedMembers(data.votedMembers);
    } else {
      console.error('Error fetching voted members:', response.statusText);
    }
  };

  const handleMemberPresence = (memberId: string, isPresent: boolean, replacedBy?: string) => {
    const allMembers = [...members, ...mmMembers];
    const memberToUpdate = allMembers.find(m => m._id.toString() === memberId);
    if (!memberToUpdate) return;

    if (memberToUpdate.isMM) {
      setMMMembers(prev =>
        prev.map(m => (m._id.toString() === memberId ? { ...m, isPresent } : m))
      );
    } else {
      setMembers(prev => prev.map(m => (m._id.toString() === memberId ? { ...m, isPresent } : m)));
    }

    const endpoint = memberToUpdate.isMM
      ? `/api/events/mm-members/${memberId}/presence`
      : `/api/events/members/${memberId}/presence`;

    // Determine the payload based on presence change and replacedBy logic
    let payload: any = { isPresent };

    if (!isPresent) {
      // Turning from present to not present: clear replacedBy if exists
      payload.replacedBy = null;
    } else if (isPresent && replacedBy) {
      // Turning from not present to present, and replacedBy is provided
      payload.replacedBy = replacedBy;
    }

    apiFetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(response => {
        if (response.ok) {
          enqueueSnackbar(`נוכחות חבר עודכנה בהצלחה`, { variant: 'success' });
        } else {
          enqueueSnackbar(`נכשל עדכון נוכחות חבר`, { variant: 'error' });
        }
      })
      .catch(error => {
        console.error('Error updating member presence:', error);
        enqueueSnackbar(`שגיאה בעדכון נוכחות חבר`, { variant: 'error' });
      });
  };

  useEffect(() => {
    console.log('Members:', members);
    console.log('MM Members:', mmMembers);
  }, [members, mmMembers]);

  useEffect(() => {
    if (activeRound) {
      refreshVotedMembers(activeRound._id.toString());
      const checkRoundLocked = async () => {
        try {
          const res = await apiFetch(`/api/events/roundStatus/${activeRound._id}`, {
            method: 'GET'
          });
          if (res.ok) {
            const data = await res.json();
            setIsRoundLocked(data.isLocked);
            if (data.isLocked) {
              handleShowResults(activeRound);
            }
          }
        } catch (error) {
          console.error('Error checking round status:', error);
        }
      };
      checkRoundLocked();
    }
  }, [activeRound]);

  const { socket, connectionStatus } = useWebsocket([
    {
      name: 'voteSubmitted',
      handler: (votingMember: WithId<Member>, standId: number) => {
        enqueueSnackbar(`${votingMember.name} הגיש הצבעה בעמדה ${standId}`, { variant: 'info' });
        setStandStatuses(prev => ({
          ...prev,
          [standId]: { ...prev[standId], status: 'VotingSubmitted' }
        }));
      }
    },
    {
      name: 'voteProcessed',
      handler: (votingMember: WithId<Member>, standId: number) => {
        enqueueSnackbar(`הצבעת ${votingMember.name} עובדה בהצלחה בעמדה ${standId}`, {
          variant: 'success'
        });
        setStandStatuses(prev => ({
          ...prev,
          [standId]: { status: 'Empty', member: null }
        }));
        refreshVotedMembers(activeRound?._id.toString() || '');
      }
    }
  ]);

  const handleMemberPresenceUpdate = async (
    memberId: string,
    isPresent: boolean,
    replacedBy?: string | null
  ) => {
    const allCurrentMembers = [...members, ...mmMembers];
    const memberToUpdate = allCurrentMembers.find(m => m._id.toString() === memberId);

    if (!memberToUpdate) {
      enqueueSnackbar('שגיאה: חבר לא נמצא', { variant: 'error' });
      return;
    }

    const endpoint = memberToUpdate.isMM
      ? `/api/events/mm-members/${memberId}/presence`
      : `/api/events/members/${memberId}/presence`;

    const payload: { isPresent: boolean; replacedBy?: string | null } = { isPresent };
    if (replacedBy !== undefined) {
      // only include replacedBy if it's explicitly passed (string or null)
      payload.replacedBy = replacedBy;
    }

    try {
      const response = await apiFetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'שגיאה בעדכון נוכחות' }));
        throw new Error(errorData.message);
      }

      // Update local state immutably
      if (memberToUpdate.isMM) {
        setMMMembers(prevMMs =>
          prevMMs.map(m =>
            m._id.toString() === memberId
              ? {
                  ...m,
                  isPresent,
                  replacedBy: (payload.replacedBy !== undefined
                    ? payload.replacedBy
                    : m.replacedBy) as any
                }
              : m
          )
        );
      } else {
        setMembers(prevRegMembers =>
          prevRegMembers.map(m =>
            m._id.toString() === memberId
              ? {
                  ...m,
                  isPresent,
                  replacedBy: (payload.replacedBy !== undefined
                    ? payload.replacedBy
                    : m.replacedBy) as any
                }
              : m
          )
        );
      }
      enqueueSnackbar('נוכחות עודכנה בהצלחה', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error.message || 'שגיאה בעדכון נוכחות', { variant: 'error' });
    }
  };

  const handleSendMember = (
    member: WithId<Member>,
    targetStandId: number,
    previousStandId?: number | null
  ) => {
    console.log(
      'Sending member:',
      member,
      'to stand:',
      targetStandId,
      'from stand:',
      previousStandId
    );

    const operations: Promise<{
      standId: number | null;
      memberId: string | null;
      ok: boolean;
      action: string;
      memberName: string;
    }>[] = [];

    if (
      previousStandId !== undefined &&
      previousStandId !== null &&
      previousStandId !== targetStandId
    ) {
      operations.push(
        new Promise(resolve => {
          socket.emit('loadVotingMember', null, previousStandId, (response: { ok: boolean }) => {
            resolve({
              standId: previousStandId,
              memberId: null,
              ok: response.ok,
              action: 'clear',
              memberName: member.name
            });
          });
        })
      );
    }

    operations.push(
      new Promise(resolve => {
        socket.emit('loadVotingMember', member, targetStandId, (response: { ok: boolean }) => {
          resolve({
            standId: targetStandId,
            memberId: member._id.toString(),
            ok: response.ok,
            action: 'load',
            memberName: member.name
          });
        });
      })
    );

    Promise.all(operations).then(results => {
      const allOk = results.every(r => r.ok);

      if (allOk) {
        setStandStatuses(prev => {
          const newStatuses = { ...prev };

          if (
            previousStandId !== undefined &&
            previousStandId !== null &&
            previousStandId !== targetStandId
          ) {
            newStatuses[previousStandId] = { status: 'Empty', member: null };
          }
          newStatuses[targetStandId] = { status: 'Voting', member };

          return newStatuses;
        });
        enqueueSnackbar(`${member.name} הועבר/נשלח לעמדה ${targetStandId}`, { variant: 'success' });
      } else {
        enqueueSnackbar('שגיאה בהעברת המצביע', { variant: 'error' });
        results.forEach(result => {
          if (!result.ok) {
            if (result.action === 'clear') {
              enqueueSnackbar(`שגיאה בפינוי ${result.memberName} מעמדה ${result.standId}`, {
                variant: 'warning'
              });
            } else if (result.action === 'load') {
              enqueueSnackbar(`שגיאה בשיבוץ ${result.memberName} לעמדה ${result.standId}`, {
                variant: 'warning'
              });
            }
          }
        });
        console.error('Error in multi-step stand update, results:', results);
      }
    });
  };

  const handleReturnMemberToBank = (member: WithId<Member>, previousStandId: number) => {
    console.log('Returning member to bank:', member, 'from stand:', previousStandId);
    socket.emit('loadVotingMember', null, previousStandId, (response: { ok: boolean }) => {
      if (response.ok) {
        setStandStatuses(prev => ({
          ...prev,
          [previousStandId]: { status: 'Empty', member: null }
        }));
        enqueueSnackbar(`${member.name} הוחזר מהעמדה לבנק`, { variant: 'info' });
      } else {
        enqueueSnackbar('שגיאה בהחזרת המצביע לבנק', { variant: 'error' });
      }
    });
  };

  const handleStartRound = (round: WithId<Round>) => {
    console.log('Starting round:', round);
    setActiveRound(round);
    socket.emit('loadRound', round._id, (response: { ok: boolean }) => {
      if (response.ok) {
        console.log('Round started successfully');
        enqueueSnackbar(`הסבב ${round.name} החל`, { variant: 'success' });
        setStandStatuses(prev => {
          const newStatuses = { ...prev };
          Object.keys(newStatuses).forEach(standId => {
            newStatuses[parseInt(standId)] = { status: 'Empty', member: null };
          });
          return newStatuses;
        });
      } else {
        console.error('Error starting round');
        enqueueSnackbar('שגיאה בהתחלת הסבב', { variant: 'error' });
      }
    });
  };

  const handleStopRound = () => {
    console.log('Stopping round:', activeRound);
    setActiveRound(null);
    setSelectedRound(null);
    socket.emit('loadRound', null, (response: { ok: boolean }) => {
      if (response.ok) {
        console.log('Round stopped successfully');
        enqueueSnackbar(`הסבב ${activeRound?.name} הסתיים`, { variant: 'info' });
        setStandStatuses(prev => {
          const newStatuses = { ...prev };
          Object.keys(newStatuses).forEach(standId => {
            newStatuses[parseInt(standId)] = { status: 'NotStarted', member: null };
          });
          return newStatuses;
        });
      } else {
        console.error('Error stopping round');
        enqueueSnackbar('שגיאה בהפסקת הסבב', { variant: 'error' });
      }
    });
  };

  const handleCancelMember = (standId: number) => {
    socket.emit('loadVotingMember', null, standId, (response: { ok: boolean }) => {
      if (response.ok) {
        setStandStatuses(prev => ({
          ...prev,
          [standId]: { status: 'Empty', member: null }
        }));
        enqueueSnackbar(`המצביע בוטל מעמדה ${standId}`, { variant: 'info' });
      } else {
        enqueueSnackbar('שגיאה בביטול המצביע', { variant: 'error' });
      }
    });
  };

  const handleDeleteRound = async (round: WithId<Round>) => {
    try {
      const res = await apiFetch(`/api/events/deleteRound`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId: round._id })
      });
      if (!res.ok) throw new Error('Failed to delete round');
      enqueueSnackbar('Round deleted successfully', { variant: 'success' });
      router.replace(router.asPath);
    } catch (error) {
      enqueueSnackbar('Failed to delete round', { variant: 'error' });
    }
    setRoundToDelete(null);
  };

  const handleLockRound = async () => {
    if (!activeRound) return;

    const shouldLock = window.confirm(
      'האם אתה בטוח שברצונך לנעול את הסבב? הסבב יסתיים ולא ניתן יהיה להצביע יותר.'
    );

    if (!shouldLock) return;

    try {
      const res = await apiFetch(`/api/events/lockRound/${activeRound._id}`, {
        method: 'POST'
      });

      if (res.ok) {
        setIsRoundLocked(true);

        const resultsRes = await apiFetch(`/api/events/roundResults/${activeRound._id}`, {
          method: 'GET'
        });
        if (resultsRes.ok) {
          const data = await resultsRes.json();
          setRoundResults(data.results);
          socket.emit('loadRound', null, (response: { ok: boolean }) => {
            if (response.ok) {
              console.log('Round stopped successfully');
              enqueueSnackbar(`הסבב ${activeRound?.name} הסתיים`, { variant: 'info' });
              setStandStatuses(prev => {
                const newStatuses = { ...prev };
                Object.keys(newStatuses).forEach(standId => {
                  newStatuses[parseInt(standId)] = { status: 'NotStarted', member: null };
                });
                return newStatuses;
              });
            } else {
              console.error('Error stopping round');
              enqueueSnackbar('שגיאה בהפסקת הסבב', { variant: 'error' });
            }
          });

          enqueueSnackbar(`הסבב ${activeRound.name} ננעל והתוצאות מוצגות`, { variant: 'success' });
        }

        socket.emit('loadRound', null, (response: { ok: boolean }) => {
          if (response.ok) {
            console.log('Round locked successfully');
            enqueueSnackbar(`הסבב ${activeRound.name} ננעל`, { variant: 'info' });
          } else {
            console.error('Error locking round');
            enqueueSnackbar('שגיאה בנעילת הסבב', { variant: 'error' });
          }
        });
        setStandStatuses(prev => {
          const newStatuses = { ...prev };
          Object.keys(newStatuses).forEach(standId => {
            newStatuses[parseInt(standId)] = { status: 'NotStarted', member: null };
          });
          return newStatuses;
        });
      } else {
        enqueueSnackbar('שגיאה בנעילת הסבב', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error locking round:', error);
      enqueueSnackbar('שגיאה בנעילת הסבב', { variant: 'error' });
    }
  };

  const handleShowResults = async (round: WithId<Round>) => {
    try {
      const res = await apiFetch(`/api/events/roundResults/${round._id}`, {
        method: 'GET'
      });

      if (res.ok) {
        const data = await res.json();
        setActiveRound(round);
        setIsRoundLocked(true);
        setRoundResults(data.results);
      } else {
        enqueueSnackbar('שגיאה בטעינת התוצאות', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error loading round results:', error);
      enqueueSnackbar('שגיאה בטעינת התוצאות', { variant: 'error' });
    }
  };

  const handleUnlockRound = async () => {
    if (!activeRound) return;

    const shouldUnlock = window.confirm(
      'האם אתה בטוח שברצונך לבטל את נעילת הסבב? כל ההצבעות ימחקו והסבב יפתח מחדש.'
    );

    if (!shouldUnlock) return;

    try {
      const res = await apiFetch(`/api/events/unlockRound/${activeRound._id}`, {
        method: 'POST'
      });

      if (res.ok) {
        setIsRoundLocked(false);
        setRoundResults(null);
        setVotedMembers([]);
        enqueueSnackbar('נעילת הסבב בוטלה והסבב נפתח מחדש', { variant: 'success' });
      } else {
        enqueueSnackbar('שגיאה בביטול נעילת הסבב', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error unlocking round:', error);
      enqueueSnackbar('שגיאה בביטול נעילת הסבב', { variant: 'error' });
    }
  };

  const handleGoBack = () => {
    setActiveRound(null);
    setIsRoundLocked(false);
    setRoundResults(null);
    setVotedMembers([]);
  };

  return (
    <RoleAuthorizer
      user={user}
      allowedRoles="election-manager"
      onFail={() => {
        router.push(`/mtes/${user.role}`);
        enqueueSnackbar('לא נמצאו הרשאות מתאימות.', { variant: 'error' });
      }}
    >
      <DndProvider backend={HTML5Backend}>
        <Layout
          title={`ממשק ${user.role && localizedRoles[user.role]}`}
          connectionStatus={connectionStatus}
        >
          <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                textAlign: 'center',
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                color: 'white',
                mb: 3
              }}
            >
              <Typography variant="h4" fontWeight="bold">
                ניהול הבחירות
              </Typography>
            </Paper>
            <Paper elevation={2} sx={{ p: 4 }}>
              {' '}
              {/* This Paper should wrap the tab content */}
              {presentMembersCount / (members.length + mmMembers.length) >= 0.66 ? null : (
                <MemberPresenceStatus
                  presentCount={presentMembersCount}
                  totalCount={members.length + mmMembers.length} // Corrected total count
                />
              )}
              <Box
                sx={{
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  mb: 3
                }}
              >
                {members.length + mmMembers.length > 0 &&
                  presentMembersCount / (members.length + mmMembers.length) >= 0.66 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)'
                      }}
                    >
                      <MemberPresenceStatus
                        presentCount={presentMembersCount}
                        totalCount={members.length + mmMembers.length} // Corrected total count
                      />
                    </Box>
                  )}

                <Tabs
                  value={currentTab}
                  onChange={handleTabChange}
                  aria-label="election manager tabs"
                  centered
                  textColor="inherit"
                >
                  <Tab label="ניהול סבב" />
                  <Tab label="ניהול משתתפים" />
                </Tabs>
              </Box>
              {currentTab === 0 && (
                <>
                  {activeRound ? (
                    <Box>
                      <RoundHeader
                        title={activeRound.name}
                        isActive
                        isLocked={isRoundLocked}
                        onBack={isRoundLocked ? handleGoBack : undefined}
                        onLock={!isRoundLocked ? handleLockRound : undefined}
                        onStop={!isRoundLocked ? handleStopRound : undefined}
                      />
                      {!roundResults && (
                        <>
                          <VotingStatusComponent
                            votedCount={votedMembers.length}
                            totalCount={members.length}
                          />
                          <VotingStandsGrid
                            standStatuses={standStatuses}
                            onCancel={handleCancelMember}
                            onDropMember={handleSendMember}
                          />
                        </>
                      )}

                      {roundResults ? (
                        <>
                          <RoundResults
                            round={activeRound}
                            results={roundResults}
                            votedMembers={votedMembers}
                            totalMembers={members.length}
                            electionThreshold={event.electionThreshold}
                          />
                          <MembersGrid
                            members={members}
                            votedMembers={votedMembers}
                            standStatuses={standStatuses}
                            filterType="voted"
                            onDropMemberBackToBank={handleReturnMemberToBank}
                          />
                          <MembersGrid
                            members={members}
                            votedMembers={votedMembers}
                            standStatuses={standStatuses}
                            filterType="notPresent"
                            onDropMemberBackToBank={handleReturnMemberToBank}
                          />
                        </>
                      ) : (
                        <>
                          <MembersGrid
                            members={members}
                            votedMembers={votedMembers}
                            standStatuses={standStatuses}
                            filterType="waitingToVote"
                            onDropMemberBackToBank={handleReturnMemberToBank}
                          />

                          <MembersGrid
                            members={members}
                            votedMembers={votedMembers}
                            standStatuses={standStatuses}
                            filterType="voted"
                            onDropMemberBackToBank={() => {}}
                          />
                          <MembersGrid
                            members={members}
                            votedMembers={votedMembers}
                            standStatuses={standStatuses}
                            filterType="notPresent"
                            onDropMemberBackToBank={() => {}}
                          />
                        </>
                      )}
                    </Box>
                  ) : selectedRound ? (
                    <Box>
                      <RoundHeader
                        title={selectedRound.name}
                        onBack={() => setSelectedRound(null)}
                        onStart={() => handleStartRound(selectedRound)}
                      />

                      <RoundPreview round={selectedRound} members={members} />
                    </Box>
                  ) : (
                    <Box>
                      <ControlRounds
                        rounds={rounds}
                        setSelectedRound={setSelectedRound}
                        handleShowResults={handleShowResults}
                        members={members}
                        refreshData={() => router.replace(router.asPath)}
                      />
                    </Box>
                  )}
                </>
              )}
              {currentTab === 1 && (
                <Box sx={{ mt: 3 }}>
                  <MemberPresence
                    allMembers={allMembersForPresence}
                    onMemberUpdate={handleMemberPresenceUpdate}
                  />
                </Box>
              )}
            </Paper>{' '}
            {/* This closes the Paper from line 605 */}
            <Dialog
              open={roundToDelete !== null}
              onClose={() => setRoundToDelete(null)}
              aria-labelledby="delete-round-dialog-title"
              aria-describedby="delete-round-dialog-description"
            >
              <DialogTitle id="delete-round-dialog-title">Delete Round</DialogTitle>
              <DialogContent>
                <DialogContentText id="delete-round-dialog-description">
                  {roundToDelete &&
                    `Are you sure you want to delete the round "${roundToDelete.name}"? This action cannot be undone.`}
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setRoundToDelete(null)}>Cancel</Button>
                <Button
                  onClick={() => roundToDelete && handleDeleteRound(roundToDelete)}
                  color="error"
                  variant="contained"
                  autoFocus
                >
                  Delete
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        </Layout>
      </DndProvider>
    </RoleAuthorizer>
  );
};

export const getServerSideProps: GetServerSideProps = async ctx => {
  try {
    const { user } = await getUserAndDivision(ctx);

    const data = await serverSideGetRequests(
      {
        rounds: '/api/events/rounds',
        electionState: '/api/events/state',
        members: '/api/events/members',
        mmMembers: '/api/events/mm-members', // Added mmMembers endpoint
        event: '/public/event'
      },
      ctx
    );

    return { props: { user, ...data } }; // Pass combined list as members
  } catch {
    return { redirect: { destination: '/login', permanent: false } };
  }
};

export default Page;
