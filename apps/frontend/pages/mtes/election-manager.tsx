import { useEffect, useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import { useRouter } from 'next/router';
import { GetServerSideProps, NextPage } from 'next';
import { WithId } from 'mongodb';
import { Paper, Typography, Box, Button, Stack } from '@mui/material';
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

interface Props {
  user: WithId<SafeUser>;
  members: WithId<Member>[];
  rounds: WithId<Round>[];
  electionState: WithId<ElectionState>;
  event: ElectionEvent;
}

const Page: NextPage<Props> = ({ user, members, rounds, electionState, event }) => {
  const router = useRouter();
  const [selectedRound, setSelectedRound] = useState<WithId<Round> | null>(null);
  const [activeRound, setActiveRound] = useState<WithId<Round> | null>(
    electionState.activeRound || null
  );
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

  const refreshData = () => {
    router.replace(router.asPath);
  };

  console.log(votedMembers);

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
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleStopRound}
                    sx={{ px: 4, py: 1.5 }}
                  >
                    סיים סבב
                  </Button>
                </Box>

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
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    סבבים זמינים
                  </Typography>
                  <Grid container spacing={2}>
                    {rounds.map(round => (
                      <Grid item xs={12} sm={6} md={4} key={round._id.toString()}>
                        <Card
                          sx={{
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: 3
                            }
                          }}
                          onClick={() => setSelectedRound(round)}
                        >
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              {round.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {round.roles.length} תפקידים
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <AddRoundDialog availableMembers={members} onRoundCreated={refreshData} />
                </Box>
              </Box>
            )}
          </Paper>

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
