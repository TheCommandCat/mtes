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
import AddRoundDialog from '../../components/mtes/add-round-dialog';
import SelectVotingStandDialog from '../../components/mtes/select-voting-stand-dialog';
import { ControlRounds } from '../../components/mtes/control-rounds';
import { MembersGrid } from '../../components/mtes/members-grid';
import { RoundResults } from '../../components/mtes/round-results';
import { VotingStatus as VotingStatusComponent } from '../../components/mtes/voting-status';
import { RoundHeader } from '../../components/mtes/round-header';
import { RoundPreview } from '../../components/mtes/round-preview';
import { VotingStandsGrid } from '../../components/mtes/voting-stands-grid';

interface Props {
  user: WithId<SafeUser>;
  members: WithId<Member>[];
  rounds: WithId<Round>[];
  electionState: WithId<ElectionState>;
  event: ElectionEvent;
}

interface VotingStandStatus {
  status: VotingStates;
  member: Member | null;
}

const initialRoundStatuses = (numofStands: number): Record<number, VotingStandStatus> =>
  Object.fromEntries(
    Array.from({ length: numofStands }, (_, i) => [i, { status: 'NotStarted', member: null }])
  );

const Page: NextPage<Props> = ({ user, members, rounds, electionState, event }) => {
  const router = useRouter();
  const [selectedRound, setSelectedRound] = useState<WithId<Round> | null>(null);
  const [activeRound, setActiveRound] = useState<WithId<Round> | null>(
    electionState.activeRound || null
  );
  const [isRoundLocked, setIsRoundLocked] = useState(false);
  const [roundResults, setRoundResults] = useState<any>(null);
  const [standStatuses, setStandStatuses] = useState<Record<number, VotingStandStatus>>(
    initialRoundStatuses(event.votingStands)
  );
  const [standSelectDialogOpen, setStandSelectDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [votedMembers, setVotedMembers] = useState<WithId<VotingStatus>[]>([]);
  const [roundToDelete, setRoundToDelete] = useState<WithId<Round> | null>(null);
  const [roundToEdit, setRoundToEdit] = useState<WithId<Round> | null>(null);

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
        getVotedMembers(activeRound?._id.toString() || '');
      }
    }
  ]);

  const handleOpenDialog = (member: Member) => {
    setSelectedMember(member);
    setStandSelectDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setStandSelectDialogOpen(false);
    setSelectedMember(null);
  };

  const handleSendMember = (member: Member, votingStand: number) => {
    console.log('Sending member:', member);
    console.log('Voting stand:', votingStand);
    console.log('Socket:', socket.connected);

    socket.emit('loadVotingMember', member, votingStand, (response: { ok: boolean }) => {
      if (response.ok) {
        console.log('Member sent successfully');
        setStandStatuses(prev => ({
          ...prev,
          [votingStand]: { status: 'Voting', member }
        }));
        enqueueSnackbar(`${member.name} נשלח להצבעה בעמדה ${votingStand}`, { variant: 'success' });
      } else {
        console.error('Error sending member');
        enqueueSnackbar('שגיאה בשליחת המצביע', { variant: 'error' });
      }
    });
  };

  const handleSelectVotingStand = (standId: number) => {
    if (selectedMember) {
      handleSendMember(selectedMember, standId);
    }
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
            <VotingStandsGrid standStatuses={standStatuses} onCancel={handleCancelMember} />

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
                      onMemberClick={handleOpenDialog}
                    />

                    <MembersGrid
                      members={members}
                      votedMembers={votedMembers}
                      standStatuses={standStatuses}
                      showVoted={true}
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
                <RoundHeader title="אנא בחרו סבב" subtitle="סבב נבחר" />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 4 }}>
                  <AddRoundDialog availableMembers={members} onRoundCreated={refreshData} />
                </Box>

                <ControlRounds
                  rounds={rounds}
                  setSelectedRound={setSelectedRound}
                  handleShowResults={handleShowResults}
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

          {/* Voting Stand Selection Dialog */}
          {selectedMember && (
            <SelectVotingStandDialog
              open={standSelectDialogOpen}
              onClose={handleCloseDialog}
              onSelect={handleSelectVotingStand}
              votingStands={event.votingStands}
              memberName={selectedMember.name}
            />
          )}
        </Box>
      </Layout>
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
