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
import { Member, Round, SafeUser } from '@mtes/types';
import Layout from '../../components/layout';
import { RoleAuthorizer } from '../../components/role-authorizer';
import { useWebsocket } from '../../hooks/use-websocket';
import { apiFetch, getUserAndDivision, serverSideGetRequests } from '../../lib/utils/fetch';
import { SelectedRound } from 'apps/frontend/components/mtes/selected-round';
import { ActiveRound } from 'apps/frontend/components/mtes/active-round';
import { ControlRounds } from 'apps/frontend/components/mtes/control-rounds';

interface Props {
  user: WithId<SafeUser>;
  rounds: WithId<Round>[];
}

const Page: NextPage<Props> = ({ user, rounds }) => {
  const router = useRouter();
  const [selectedRound, setSelectedRound] = useState<WithId<Round> | null>(null);
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

  const handleDeleteRound = (round: WithId<Round>) => {
    console.log('Deleting round:', round);
    apiFetch(`/api/events/deleteRound`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundId: round._id })
    }).then(() => {
      enqueueSnackbar(`הסבב ${round.name} נמחק`, { variant: 'success' });
      router.reload();
    });
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
                <ActiveRound
                  activeRound={activeRound}
                  setActiveRound={setActiveRound}
                  setSelectedRound={setSelectedRound}
                  handleSendMember={handleSendMember}
                />
              ) : selectedRound ? (
                <>
                  <SelectedRound
                    selectedRound={selectedRound}
                    setSelectedRound={setSelectedRound}
                    handleStartRound={handleStartRound}
                  />
                  <ControlRounds
                    rounds={rounds}
                    setSelectedRound={setSelectedRound}
                    handleDeleteRound={handleDeleteRound}
                  />
                </>
              ) : (
                <>
                  <Box
                    sx={{
                      height: 100,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'background.default',
                      borderRadius: 1
                    }}
                  >
                    <Typography variant="h5" align="center">
                      אין סבב פעיל
                    </Typography>
                  </Box>
                  <ControlRounds
                    rounds={rounds}
                    setSelectedRound={setSelectedRound}
                    handleDeleteRound={handleDeleteRound}
                  />
                </>
              )}
            </Paper>
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
