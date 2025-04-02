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
import { SelectedRound } from 'apps/frontend/components/mtes/selected-round';
import { ActiveRound } from 'apps/frontend/components/mtes/active-round';
import { ControlRounds } from 'apps/frontend/components/mtes/control-rounds';

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
                <ActiveRound
                  activeRound={activeRound}
                  setActiveRound={setActiveRound}
                  setSelectedRound={setSelectedRound}
                  handleSendMember={handleSendMember}
                />
              ) : selectedRound ? (
                <SelectedRound
                  selectedRound={selectedRound}
                  setSelectedRound={setSelectedRound}
                  handleStartRound={handleStartRound}
                />
              ) : (
                <Typography variant="h5" align="center">
                  אין סבב פעיל
                </Typography>
              )}
            </Paper>

            <Typography variant="h5" gutterBottom align="center">
              ניהול הצבעות
            </Typography>
            <ControlRounds
              rounds={rounds}
              setSelectedRound={setSelectedRound}
              activeRound={activeRound}
            />
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
