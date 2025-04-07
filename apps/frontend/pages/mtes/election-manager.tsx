import { useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import { useRouter } from 'next/router';
import { GetServerSideProps, NextPage } from 'next';
import { ObjectId, WithId } from 'mongodb';
import {
  Paper,
  Typography,
  Box,
  Button,
  List,
  Divider,
  ListItem,
  ListItemText,
  Stack
} from '@mui/material';
import { ElectionState, Member, Round, SafeUser } from '@mtes/types';
import Layout from '../../components/layout';
import { RoleAuthorizer } from '../../components/role-authorizer';
import { useWebsocket } from '../../hooks/use-websocket';
import { apiFetch, getUserAndDivision, serverSideGetRequests } from '../../lib/utils/fetch';
import { SelectedRound } from 'apps/frontend/components/mtes/selected-round';
import { ActiveRound } from 'apps/frontend/components/mtes/active-round';
import { ControlRounds } from 'apps/frontend/components/mtes/control-rounds';
import AddRoundDialog from '../../components/mtes/add-round-dialog'; // Import the new component
import {
  Card,
  CardContent,
  Avatar,
  Grid,
  Chip
} from '@mui/material';

interface Props {
  user: WithId<SafeUser>;
  members: WithId<Member>[]; // Add members prop
  rounds: WithId<Round>[];
  electionState: WithId<ElectionState>;
}

const Page: NextPage<Props> = ({ user, members, rounds, electionState }) => { // Add members to destructuring
  const router = useRouter();
  const [selectedRound, setSelectedRound] = useState<WithId<Round> | null>(null);
  const [activeRound, setActiveRound] = useState<WithId<Round> | null>(electionState.activeRound || null);

  const { socket, connectionStatus } = useWebsocket([
    // handle ws eventes
  ]);

  const handleSendMember = (member: Member) => {
    console.log('Sending member:', member);
    console.log('Socket:', socket.connected);

    socket.emit('loadVotingMember', member, (response: { ok: boolean }) => {
      if (response.ok) {
        console.log('Member sent successfully');

        enqueueSnackbar(`${member.name} נשלח להצבעה`, { variant: 'success' });
      } else {
        console.error('Error sending member');
        enqueueSnackbar('שגיאה בשליחת המצביע', { variant: 'error' });
      }
    });
  };

  const handleStartRound = (round: WithId<Round>) => {
    console.log('Starting round:', round);
    setActiveRound(round);
    socket.emit('loadRound', round._id, (response: { ok: boolean }) => {
      if (response.ok) {
        console.log('Round started successfully');
      } else {
        console.error('Error starting round');
        enqueueSnackbar('שגיאה בהתחלת הסבב', { variant: 'error' });
      }
    });
    enqueueSnackbar(`הסבב ${round.name} החל`, { variant: 'success' });
  };

  const handleStopRound = () => {
    console.log('Stopping round:', activeRound);
    setActiveRound(null);
    setSelectedRound(null);
    socket.emit('loadRound', null, (response: { ok: boolean }) => {
      if (response.ok) {
        console.log('Round stopped successfully');
      } else {
        console.error('Error stopping round');
        enqueueSnackbar('שגיאה בהפסקת הסבב', { variant: 'error' });
      }
    });
    enqueueSnackbar(`הסבב ${activeRound?.name} הסתיים`, { variant: 'info' });
  };

  // Function to refresh server-side props
  const refreshData = () => {
    router.replace(router.asPath);
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
            <Typography variant="h4" fontWeight="bold">ניהול הבחירות</Typography>
          </Paper>

          <Paper elevation={2} sx={{ p: 4 }}>
            {activeRound ? (
              <Box>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 4,
                  pb: 3,
                  borderBottom: '1px solid rgba(0,0,0,0.1)'
                }}>
                  <Box>
                    <Typography color="primary" gutterBottom>סבב פעיל</Typography>
                    <Typography variant="h4" fontWeight="bold">{activeRound.name}</Typography>
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

                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: 2,
                  mb: 4
                }}>
                  {members.map(member => (
                    <Card
                      key={member._id.toString()}
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 3
                        }
                      }}
                      onClick={() => handleSendMember(member)}
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
                  ))}
                </Box>
              </Box>
            ) : selectedRound ? (
              <Box>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 4,
                  pb: 3,
                  borderBottom: '1px solid rgba(0,0,0,0.1)'
                }}>
                  <Box>
                    <Typography color="primary" gutterBottom>סבב נבחר</Typography>
                    <Typography variant="h4" fontWeight="bold">{selectedRound.name}</Typography>
                  </Box>
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="outlined"
                      onClick={() => setSelectedRound(null)}
                    >
                      חזור
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => handleStartRound(selectedRound)}
                      sx={{ px: 4 }}
                    >
                      התחל סבב
                    </Button>
                  </Stack>
                </Box>

                <Paper
                  elevation={1}
                  sx={{ p: 3, mb: 4, bgcolor: 'background.default' }}
                >
                  <Typography variant="h6" color="primary" gutterBottom>
                    מצביעים מורשים
                  </Typography>
                  <Box sx={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 2,
                    mt: 2
                  }}>
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
                  {selectedRound.roles.map(role => (
                    <Paper
                      key={role.role}
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
                <Box sx={{
                  mb: 4,
                  p: 4,
                  textAlign: 'center',
                  bgcolor: 'background.default',
                  borderRadius: 2
                }}>
                  <Typography variant="h5" color="text.secondary" gutterBottom>
                    אין סבב פעיל
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    בחר סבב מהרשימה או צור סבב חדש
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>סבבים זמינים</Typography>
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
                            <Typography variant="h6" gutterBottom>{round.name}</Typography>
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
        members: '/api/events/members' // Assuming this endpoint exists
      },
      ctx
    );

    return { props: { user, ...data } };
  } catch {
    return { redirect: { destination: '/login', permanent: false } };
  }
};

export default Page;
