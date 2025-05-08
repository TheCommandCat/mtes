import { useEffect, useState } from 'react';
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
  Button
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

interface Props {
  user: WithId<SafeUser>;
  members: WithId<Member>[];
  rounds: WithId<Round>[];
  electionState: WithId<ElectionState>;
  event: ElectionEvent;
}

const initialRoundStatuses = (
  numofStands: number,
  status: VotingStates
): Record<number, VotingStandStatus> =>
  Object.fromEntries(
    Array.from({ length: numofStands }, (_, i) => [i, { status: status, member: null }])
  ) as Record<number, VotingStandStatus>;

interface VotingStandStatus {
  status: VotingStates;
  member: WithId<Member> | null; // Changed from Member to WithId<Member>
}

const Page: NextPage<Props> = ({ user, members, rounds, electionState, event }) => {
  const router = useRouter();
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

  const getVotedMembers = async (roundId: string) => {
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

  useEffect(() => {
    if (activeRound) {
      getVotedMembers(activeRound._id.toString());
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
        // Ensure votingMember is WithId<Member>
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
        // Ensure votingMember is WithId<Member>
        enqueueSnackbar(`הצבעת ${votingMember.name} עובדה בהצלחה בעמדה ${standId}`, {
          variant: 'success'
        });
        setStandStatuses(prev => ({
          ...prev,
          [standId]: { status: 'Empty', member: null }
        }));
        getVotedMembers(activeRound?._id.toString() || '');
      }
    }
  ]);

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

    // 1. If moving from a previous stand, create a promise to emit an event to clear it
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

    // 2. Create a promise to emit an event to load the member into the target stand
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
          // Apply changes based on the operations that were part of this sequence

          // Clear previous stand if that operation was performed and part of this sequence
          if (
            previousStandId !== undefined &&
            previousStandId !== null &&
            previousStandId !== targetStandId
          ) {
            newStatuses[previousStandId] = { status: 'Empty', member: null };
          }
          // Set new stand
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
        // Consider a state refresh from server here if partial failures occur
        console.error('Error in multi-step stand update, results:', results);
      }
    });
  };

  const handleReturnMemberToBank = (member: WithId<Member>, previousStandId: number) => {
    // Changed member type to WithId<Member>
    console.log('Returning member to bank:', member, 'from stand:', previousStandId);
    // Emit an event to clear the member from the stand on the server/other clients
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
      refreshData();
    } catch (error) {
      enqueueSnackbar('Failed to delete round', { variant: 'error' });
    }
    setRoundToDelete(null);
  };

  const refreshData = () => {
    router.replace(router.asPath);
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

        // Load the results
        const resultsRes = await apiFetch(`/api/events/roundResults/${activeRound._id}`, {
          method: 'GET'
        });
        if (resultsRes.ok) {
          const data = await resultsRes.json();
          setRoundResults(data.results);
          enqueueSnackbar(`הסבב ${activeRound.name} ננעל והתוצאות מוצגות`, { variant: 'success' });
        }

        // Stop voting on stands but keep round active to show results
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

  // Add new function to handle showing results for locked rounds
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
        <Layout title={`ממשק ${user.role}`} connectionStatus={connectionStatus}>
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
              {activeRound ? (
                <Box>
                  {!roundResults && (
                    <VotingStandsGrid
                      standStatuses={standStatuses}
                      onCancel={handleCancelMember} // This can also be used to drag member back to bank
                      onDropMember={handleSendMember}
                    />
                  )}
                  <RoundHeader
                    title={activeRound.name}
                    isActive
                    isLocked={isRoundLocked}
                    onBack={isRoundLocked ? handleGoBack : undefined}
                    onLock={!isRoundLocked ? handleLockRound : undefined}
                    onStop={!isRoundLocked ? handleStopRound : undefined}
                  />

                  {roundResults ? (
                    <RoundResults
                      round={activeRound}
                      results={roundResults}
                      votedMembers={votedMembers}
                      totalMembers={members.length}
                    />
                  ) : (
                    <>
                      <VotingStatusComponent
                        votedCount={votedMembers.length}
                        totalCount={members.length}
                      />

                      <MembersGrid
                        members={members}
                        votedMembers={votedMembers}
                        standStatuses={standStatuses}
                        showVoted={false}
                        onDropMemberBackToBank={handleReturnMemberToBank}
                      />

                      <MembersGrid
                        members={members}
                        votedMembers={votedMembers}
                        standStatuses={standStatuses}
                        showVoted={true}
                        // No drop functionality for the voted list
                        onDropMemberBackToBank={() => {}} // Dummy function, not used
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
                    refreshData={refreshData}
                  />
                </Box>
              )}
            </Paper>

            {/* Delete Confirmation Dialog */}
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

            {/* Drag-and-drop replaces voting stand selection dialog */}
          </Box>
        </Layout>
      </DndProvider>
    </RoleAuthorizer>
  );
};

export const getServerSideProps: GetServerSideProps = async ctx => {
  try {
    const { user } = await getUserAndDivision(ctx);

    // Fetch members along with other data
    const data = await serverSideGetRequests(
      {
        rounds: '/api/events/rounds',
        electionState: '/api/events/state',
        members: '/api/events/members',
        event: '/public/event'
      },
      ctx
    );

    return { props: { user, ...data } };
  } catch {
    return { redirect: { destination: '/login', permanent: false } };
  }
};

export default Page;
