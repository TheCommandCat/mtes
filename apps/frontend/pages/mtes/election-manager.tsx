import { useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import { useRouter } from 'next/router';
import { GetServerSideProps, NextPage } from 'next';
import { WithId } from 'mongodb';
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
import SendIcon from '@mui/icons-material/Send';
import { Member, Round, SafeUser } from '@mtes/types';
import Layout from '../../components/layout';
import { RoleAuthorizer } from '../../components/role-authorizer';
import { useWebsocket } from '../../hooks/use-websocket';
import { getUserAndDivision, serverSideGetRequests } from '../../lib/utils/fetch';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface Props {
  user: WithId<SafeUser>;
  rounds: WithId<Round>[];
}

const Page: NextPage<Props> = ({ user, rounds }) => {
  const router = useRouter();
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [activeRound, setActiveRound] = useState<Round | null>(null);

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

  const handleStartRound = (round: Round) => {
    console.log('Starting round:', round);
    setActiveRound(round);
    enqueueSnackbar(`הסבב ${round.name} החל`, { variant: 'success' });
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
        <Box sx={{ mt: 2, maxWidth: 800, mx: 'auto' }}>
          <Paper sx={{ p: 3 }}>
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
              {activeRound ? (
                <Box>
                  <Typography variant="h5" align="center">
                    {activeRound.name}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom align="center">
                    רשימת מצביעים ({activeRound.allowedMembers.length})
                  </Typography>
                  <List>
                    {activeRound.allowedMembers.map((member, index) => (
                      <Box key={member.name}>
                        <ListItem sx={{ display: 'flex', flexDirection: 'row-reverse' }}>
                          <Button
                            variant="outlined"
                            color="primary"
                            size="small"
                            onClick={() => handleSendMember(member)}
                            startIcon={<SendIcon />}
                            sx={{ ml: 2, direction: 'ltr' }}
                          >
                            שלח
                          </Button>
                          <ListItemText
                            primary={member.name}
                            secondary={member.city}
                            sx={{ textAlign: 'right' }}
                          />
                        </ListItem>
                        {index < activeRound.allowedMembers.length - 1 && <Divider />}
                      </Box>
                    ))}
                  </List>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      setActiveRound(null);
                      setSelectedRound(null);
                      enqueueSnackbar(`סבב ${activeRound.name} הסתיים`, { variant: 'info' });
                    }}
                  >
                    סיים סבב
                  </Button>
                </Box>
              ) : selectedRound ? (
                <>
                  <Typography variant="h5" align="center">
                    {selectedRound.name}
                  </Typography>
                  <Stack direction="row" sx={{ justifyContent: 'space-evenly', p: 2 }}>
                    {selectedRound.roles.map(role => (
                      <Box key={role.role} sx={{ boxShadow: 1, p: 2, borderRadius: 1, outline: 1 }}>
                        <Typography
                          variant="h4"
                          align="center"
                          sx={{ fontSize: '1.2rem', fontWeight: 'bold' }}
                        >
                          {role.role}
                        </Typography>
                        <Stack direction="column" spacing={1}>
                          {role.contestants.map(contestant => (
                            <Typography key={contestant.name} variant="subtitle1" align="center">
                              {contestant.name}
                            </Typography>
                          ))}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                  <Typography variant="subtitle1" align="center">
                    {selectedRound.allowedMembers.length} מצביעים מורשים
                  </Typography>
                  <Stack direction="row" gap={1} sx={{ justifyContent: 'center', mt: 2 }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={() => {
                        setSelectedRound(null);
                      }}
                      startIcon={<ArrowBackIcon />}
                      sx={{ ml: 2, direction: 'ltr' }}
                    >
                      חזור
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={() => handleStartRound(selectedRound)}
                      startIcon={<SendIcon />}
                      sx={{ direction: 'ltr' }}
                    >
                      התחל הצבעה
                    </Button>
                  </Stack>
                </>
              ) : (
                <Typography variant="h5" align="center">
                  אין סבב פעיל
                </Typography>
              )}
            </Paper>
            <Typography variant="h5" gutterBottom align="center">
              ניהול הצבעות
            </Typography>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="subtitle1" gutterBottom>
                ניהול סבבים
              </Typography>
              {rounds.map(round => (
                <Box key={round._id.toString()}>
                  <ListItem sx={{ display: 'flex', flexDirection: 'row-reverse' }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={() => {
                        setSelectedRound(round);
                        enqueueSnackbar(`בחרת את הסבב ${round.name}`, { variant: 'info' });
                      }}
                      startIcon={<SendIcon />}
                      sx={{ ml: 2, direction: 'ltr' }}
                      disabled={activeRound !== null}
                    >
                      שלח
                    </Button>
                    <ListItemText
                      primary={round.name}
                      secondary={`${
                        round.roles.map(role => role.role).join(', ') || 'ללא תפקידים'
                      }`}
                      sx={{ textAlign: 'right' }}
                    />
                  </ListItem>
                  <Divider />
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>
      </Layout>
    </RoleAuthorizer>
  );
};

export const getServerSideProps: GetServerSideProps = async ctx => {
  try {
    const { user } = await getUserAndDivision(ctx);

    const data = await serverSideGetRequests(
      {
        // fetch member data
        rounds: '/api/events/rounds'
      },
      ctx
    );

    return { props: { user, ...data } };
  } catch {
    return { redirect: { destination: '/login', permanent: false } };
  }
};

export default Page;
