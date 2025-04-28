import { useEffect, useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import { useRouter } from 'next/router';
import { GetServerSideProps, NextPage } from 'next';
import { WithId } from 'mongodb';
import {
  Paper,
  Typography,
  Box,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
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
import { Card, CardContent, Avatar, Grid, Chip } from '@mui/material';
import { StandStatusCard } from 'apps/frontend/components/mtes/stand-status-card';
import { ControlRounds } from 'apps/frontend/components/mtes/control-rounds';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';

interface Props {
  user: WithId<SafeUser>;
  members: WithId<Member>[];
  rounds: WithId<Round>[];
  electionState: WithId<ElectionState>;
  event: ElectionEvent;
}

interface RoleResult {
  contestant: WithId<Member>;
  votes: number;
}

const Page: NextPage<Props> = ({ user, members, rounds, electionState, event }) => {
  const router = useRouter();
  const [selectedRound, setSelectedRound] = useState<WithId<Round> | null>(null);
  const [activeRound, setActiveRound] = useState<WithId<Round> | null>(
    electionState.activeRound || null
  );
  const [isRoundLocked, setIsRoundLocked] = useState(false);
  const [roundResults, setRoundResults] = useState<any>(null);
  const [standStatuses, setStandStatuses] = useState<
    Record<number, { status: VotingStates; member: Member | null }>
  >(
    Object.fromEntries(
      event.votingStandsIds.map(id => [
        id,
        { status: electionState.activeRound ? 'Empty' : 'NotStarted', member: null }
      ])
    )
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [votedMembers, setVotedMembers] = useState<WithId<VotingStatus>[]>([]);
  const [roundToDelete, setRoundToDelete] = useState<WithId<Round> | null>(null);
  const [roundToEdit, setRoundToEdit] = useState<WithId<Round> | null>(null);
  const [lockedRounds, setLockedRounds] = useState<Set<string>>(new Set());

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
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
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

  const handleRoundEdited = () => {
    setRoundToEdit(null);
    refreshData();
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
        socket.emit('loadRound', null);
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

  console.log(votedMembers);

  // Add this function to check if a round is locked
  const checkIfRoundLocked = (roundId: string) => {
    return lockedRounds.has(roundId);
  };

  // Update the useEffect to also fetch locked status for all rounds
  useEffect(() => {
    const fetchLockedStatus = async () => {
      const lockedIds = new Set<string>();
      for (const round of rounds) {
        try {
          const res = await apiFetch(`/api/events/roundStatus/${round._id}`, {
            method: 'GET'
          });
          if (res.ok) {
            const data = await res.json();
            if (data.isLocked) {
              lockedIds.add(round._id.toString());
            }
          }
        } catch (error) {
          console.error('Error checking round status:', error);
        }
      }
      setLockedRounds(lockedIds);
    };

    fetchLockedStatus();
  }, [rounds]);

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
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 4 }}>
              {event.votingStandsIds.map(standId => (
                <StandStatusCard
                  key={standId}
                  standId={standId}
                  status={standStatuses[standId].status}
                  member={standStatuses[standId].member}
                  onCancel={handleCancelMember}
                />
              ))}
            </Box>
            {activeRound ? (
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 4,
                    pb: 3,
                    borderBottom: '1px solid rgba(0,0,0,0.1)'
                  }}
                >
                  <Box>
                    <Typography color="primary" gutterBottom>
                      סבב פעיל
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {activeRound.name}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={handleGoBack}
                      sx={{ px: 4, py: 1.5 }}
                    >
                      חזור
                    </Button>
                    {!isRoundLocked ? (
                      <>
                        <Button
                          variant="outlined"
                          color="warning"
                          onClick={handleLockRound}
                          sx={{ px: 4, py: 1.5 }}
                        >
                          נעל וסיים סבב
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={handleStopRound}
                          sx={{ px: 4, py: 1.5 }}
                        >
                          סיים סבב ללא נעילה
                        </Button>
                      </>
                    ) : null}
                  </Stack>
                </Box>

                {roundResults ? (
                  <Paper
                    elevation={3}
                    sx={{
                      p: 4,
                      mb: 4,
                      bgcolor: 'background.paper',
                      background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                      borderRadius: 3
                    }}
                  >
                    <Typography
                      variant="h4"
                      color="primary"
                      gutterBottom
                      align="center"
                      sx={{
                        mb: 4,
                        fontWeight: 'bold',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      תוצאות ההצבעה
                    </Typography>

                    {activeRound.roles.map(role => {
                      const roleResults = (roundResults[role.role] || []) as RoleResult[];
                      const maxVotes = Math.max(...roleResults.map((r: RoleResult) => r.votes));

                      return (
                        <Box key={role.role} sx={{ mb: 6 }}>
                          <Typography
                            variant="h5"
                            sx={{
                              mb: 3,
                              color: 'text.primary',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              '&::before, &::after': {
                                content: '""',
                                flex: 1,
                                borderBottom: '2px solid',
                                borderImage:
                                  'linear-gradient(to right, transparent, primary.main, transparent) 1',
                                mx: 2
                              }
                            }}
                          >
                            {role.role}
                          </Typography>

                          <Box sx={{ px: 2 }}>
                            {roleResults.map((result: RoleResult, index: number) => {
                              const percentage = (result.votes / maxVotes) * 100;
                              const isWinning = index === 0 && result.votes > 0;

                              return (
                                <Box
                                  key={result.contestant._id.toString()}
                                  sx={{
                                    mb: 2,
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: isWinning ? 'success.soft' : 'background.default',
                                    border: '1px solid',
                                    borderColor: isWinning ? 'success.main' : 'divider',
                                    transition: 'all 0.3s ease',
                                    transform: isWinning ? 'scale(1.02)' : 'scale(1)',
                                    boxShadow: isWinning ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                                    position: 'relative',
                                    overflow: 'hidden'
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 2,
                                      position: 'relative',
                                      zIndex: 1
                                    }}
                                  >
                                    <Avatar
                                      sx={{
                                        width: 56,
                                        height: 56,
                                        bgcolor: isWinning ? 'success.main' : 'primary.main',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                      }}
                                    >
                                      {result.contestant.name.charAt(0)}
                                    </Avatar>

                                    <Box sx={{ flexGrow: 1 }}>
                                      <Typography
                                        variant="h6"
                                        sx={{
                                          fontWeight: isWinning ? 'bold' : 'medium',
                                          color: isWinning ? 'success.dark' : 'text.primary'
                                        }}
                                      >
                                        {result.contestant.name}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {result.contestant.city}
                                      </Typography>
                                    </Box>

                                    <Box sx={{ textAlign: 'right', minWidth: 100 }}>
                                      <Typography
                                        variant="h5"
                                        sx={{
                                          fontWeight: 'bold',
                                          color: isWinning ? 'success.dark' : 'primary.main'
                                        }}
                                      >
                                        {result.votes}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        קולות
                                      </Typography>
                                    </Box>
                                  </Box>

                                  {/* Progress bar background */}
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      height: '100%',
                                      width: `${percentage}%`,
                                      bgcolor: isWinning ? 'success.soft' : 'primary.soft',
                                      opacity: 0.15,
                                      transition: 'width 1s ease-out'
                                    }}
                                  />
                                </Box>
                              );
                            })}
                          </Box>
                        </Box>
                      );
                    })}

                    {/* Add total votes summary */}
                    <Box
                      sx={{
                        mt: 4,
                        pt: 3,
                        borderTop: '2px solid',
                        borderColor: 'divider',
                        textAlign: 'center'
                      }}
                    >
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        סה"כ הצבעות
                      </Typography>
                      <Typography
                        variant="h3"
                        color="primary"
                        sx={{
                          fontWeight: 'bold',
                          textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        {votedMembers.length}
                        <Typography
                          component="span"
                          variant="h5"
                          color="text.secondary"
                          sx={{ ml: 2 }}
                        >
                          מתוך {members.length}
                        </Typography>
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          mt: 1,
                          color: 'success.main',
                          fontWeight: 'medium'
                        }}
                      >
                        {Math.round((votedMembers.length / members.length) * 100)}% הצבעה הושלמה
                      </Typography>
                    </Box>
                  </Paper>
                ) : (
                  <Paper
                    elevation={2}
                    sx={{
                      p: 4,
                      mb: 4,
                      background: 'linear-gradient(to right, #f5f5f5, #ffffff)',
                      borderRadius: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}
                  >
                    <Typography variant="h5" color="primary" gutterBottom>
                      סטטוס הצבעה
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h3" fontWeight="bold" color="primary">
                        {votedMembers.length}
                      </Typography>
                      <Typography variant="h4" color="text.secondary">
                        /
                      </Typography>
                      <Typography variant="h3" fontWeight="bold">
                        {members.length}
                      </Typography>
                    </Box>
                    <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
                      {Math.round((votedMembers.length / members.length) * 100)}% מהמצביעים השלימו
                      הצבעה
                    </Typography>
                  </Paper>
                )}

                {/* Non-voted members section */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    ממתינים להצבעה ({members.length - votedMembers.length})
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                      gap: 2
                    }}
                  >
                    {members.map(member => {
                      const hasVoted = votedMembers.some(
                        vm => vm.memberId.toString() === member._id.toString()
                      );
                      const isCurrentlyVoting = Object.values(standStatuses).some(
                        s => s.member?.name === member.name
                      );

                      if (hasVoted) return null;

                      return (
                        <Card
                          key={member._id.toString()}
                          sx={{
                            cursor: isCurrentlyVoting ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: isCurrentlyVoting ? 'none' : 'translateY(-2px)',
                              boxShadow: isCurrentlyVoting ? 1 : 3
                            },
                            opacity: isCurrentlyVoting ? 0.6 : 1
                          }}
                          onClick={() => !isCurrentlyVoting && handleOpenDialog(member)}
                        >
                          <CardContent sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar sx={{ bgcolor: 'primary.main' }}>
                                {member.name.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="h6">{member.name}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {member.city}
                                </Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Box>
                </Box>

                {/* Voted members section */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" color="success.main" gutterBottom>
                    הצביעו ({votedMembers.length})
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                      gap: 2
                    }}
                  >
                    {members.map(member => {
                      const hasVoted = votedMembers.some(
                        vm => vm.memberId.toString() === member._id.toString()
                      );

                      if (!hasVoted) return null;

                      return (
                        <Card
                          key={member._id.toString()}
                          sx={{
                            cursor: 'not-allowed',
                            bgcolor: 'jobseeker.main',
                            opacity: 0.8
                          }}
                        >
                          <CardContent sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar sx={{ bgcolor: 'success.main' }}>
                                {member.name.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="h6">{member.name}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {member.city}
                                </Typography>
                                <Typography variant="body2" color="success.dark">
                                  הצביע
                                </Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Box>
                </Box>
              </Box>
            ) : selectedRound ? (
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 4,
                    pb: 3,
                    borderBottom: '1px solid rgba(0,0,0,0.1)'
                  }}
                >
                  <Box>
                    <Typography color="primary" gutterBottom>
                      סבב נבחר
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {selectedRound?.name}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={2}>
                    <Button variant="outlined" onClick={() => setSelectedRound(null)}>
                      חזור
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => selectedRound && handleStartRound(selectedRound)}
                      sx={{ px: 4 }}
                    >
                      התחל סבב
                    </Button>
                  </Stack>
                </Box>

                <Paper elevation={1} sx={{ p: 3, mb: 4, bgcolor: 'background.default' }}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    מצביעים מורשים
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: 2,
                      mt: 2
                    }}
                  >
                    {members.map(member => (
                      <Chip
                        key={member._id.toString()}
                        avatar={<Avatar>{member.name.charAt(0)}</Avatar>}
                        label={`${member.name} - ${member.city}`}
                        variant="outlined"
                        sx={{
                          height: 'auto',
                          '& .MuiChip-label': {
                            whiteSpace: 'normal',
                            py: 1
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Paper>

                <Box sx={{ mb: 4 }}>
                  {selectedRound?.roles.map(role => (
                    <Paper
                      key={role.role.toString()}
                      elevation={1}
                      sx={{ p: 3, mb: 2, bgcolor: 'background.default' }}
                    >
                      <Typography variant="h6" color="primary" gutterBottom>
                        {role.role}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        מקסימום הצבעות: {role.maxVotes}
                      </Typography>
                      <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {role.contestants.map(contestant => (
                          <Chip
                            key={contestant.name}
                            label={`${contestant.name} - ${contestant.city}`}
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Paper>
                  ))}
                </Box>
              </Box>
            ) : (
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 4,
                    pb: 3,
                    borderBottom: '1px solid rgba(0,0,0,0.1)'
                  }}
                >
                  <Box>
                    <Typography color="primary" gutterBottom>
                      סבב נבחר
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      אנא בחרו סבב
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <AddRoundDialog
                      availableMembers={members}
                      onRoundCreated={handleRoundEdited}
                      initialRound={roundToEdit || undefined}
                      isEdit={!!roundToEdit}
                    />
                  </Box>
                </Box>

                <ControlRounds
                  rounds={rounds}
                  setSelectedRound={setSelectedRound}
                  handleShowResults={handleShowResults}
                  isRoundLocked={checkIfRoundLocked}
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
              open={dialogOpen}
              onClose={handleCloseDialog}
              onSelect={handleSelectVotingStand}
              votingStands={event.votingStandsIds}
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
