import { useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import { useRouter } from 'next/router';
import { GetServerSideProps, NextPage } from 'next';
import { WithId } from 'mongodb';
import { TabContext, TabPanel } from '@mui/lab';
import {
  Paper,
  Tabs,
  Tab,
  Typography,
  Box,
  Button,
  List,
  Divider,
  ListItem,
  ListItemText,
  Stack,
  Input
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { DivisionState, DivisionWithEvent, Member, SafeUser } from '@mtes/types';
import Layout from '../../components/layout';
import { RoleAuthorizer } from '../../components/role-authorizer';
import { useWebsocket } from '../../hooks/use-websocket';
import { getUserAndDivision, serverSideGetRequests } from '../../lib/utils/fetch';
import { useQueryParam } from '../../hooks/use-query-param';

interface Props {
  user: WithId<SafeUser>;
  members: WithId<Member>[];
}

const Page: NextPage<Props> = ({ user, members }) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useQueryParam('tab', '1');
  const [roundId, setRoundId] = useState('');

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
            <Typography variant="h5" gutterBottom align="center" sx={{ mb: 3 }}>
              ניהול הצבעות
            </Typography>
            <Typography variant="subtitle1" gutterBottom align="center" sx={{ mb: 3 }}>
              רשימת מצביעים ({members.length})
            </Typography>
            <List>
              {members.map((member, index) => (
                <Box key={member._id.toString()}>
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
                  {index < members.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="subtitle1" gutterBottom>
                ניהול סבבים
              </Typography>
              <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
                <Input
                  placeholder="הכנס מזהה סבב"
                  value={roundId}
                  onChange={e => setRoundId(e.target.value)}
                />
                <Button
                  variant="contained"
                  onClick={() => {
                    if (roundId && /^[0-9a-fA-F]{24}$/.test(roundId)) {
                      socket.emit('loadRound', roundId);
                      setRoundId('');
                    } else {
                      enqueueSnackbar('מזהה סבב לא תקין. נדרש מזהה באורך 24 תווים הקסדצימליים.', { variant: 'error' });
                    }
                  }}
                >
                  שלח מזהה סבב
                </Button>
              </Stack>
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
        members: '/api/events/members'
      },
      ctx
    );

    return { props: { user, ...data } };
  } catch {
    return { redirect: { destination: '/login', permanent: false } };
  }
};

export default Page;
