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
  ListItemText
} from '@mui/material';
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

  const { socket, connectionStatus } = useWebsocket([
    // handle ws eventes
  ]);

  // console.log(JSON.stringify(membersFormated, null, 2));

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
        <Box sx={{ mt: 2 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Election Manager UI
            </Typography>
            <Typography variant="subtitle1" gutterBottom>
              Members List ({members.length})
            </Typography>
            <List>
              {members.map((member, index) => (
                <Box key={member._id.toString()}>
                  <ListItem>
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
    console.log('we got into the catch block');

    return { redirect: { destination: '/login', permanent: false } };
  }
};

export default Page;
