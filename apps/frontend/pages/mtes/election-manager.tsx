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

interface Props {
  user: WithId<SafeUser>;
  members: WithId<Member>[]; // Add members prop
  rounds: WithId<Round>[];
  electionState: WithId<ElectionState>;
}

const Page: NextPage<Props> = ({ user, members, rounds, electionState }) => { // Add members to destructuring
  const router = useRouter();
  const [selectedRound, setSelectedRound] = useState<WithId<Round> | null>(null);
  const [activeRound, setActiveRound] = useState<Round | null>(electionState.activeRound || null);

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
        <Box sx={{ mt: 2, maxWidth: 800, mx: 'auto' }}>
          <Paper sx={{ p: 3 }}>
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
              {activeRound ? (
                <ActiveRound
                  activeRound={activeRound}
                  handleSendMember={handleSendMember}
                  handleStopRound={handleStopRound}
                />
              ) : selectedRound ? (
                <>
                  <SelectedRound
                    selectedRound={selectedRound}
                    setSelectedRound={setSelectedRound}
                    handleStartRound={handleStartRound}
                  />
                  <ControlRounds rounds={rounds} setSelectedRound={setSelectedRound} />
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
                  <ControlRounds rounds={rounds} setSelectedRound={setSelectedRound} />
                  {/* Add the button/dialog here */}
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                     <AddRoundDialog availableMembers={members} onRoundCreated={refreshData} />
                  </Box>
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
