import { useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import { useRouter } from 'next/router';
import { GetServerSideProps, NextPage } from 'next';
import { WithId } from 'mongodb';
import { TabContext, TabPanel } from '@mui/lab';
import { Paper, Tabs, Tab, Typography, Box, Button } from '@mui/material';
import { DivisionState, DivisionWithEvent, Member, SafeUser } from '@mtes/types';
import Layout from '../../components/layout';
import { RoleAuthorizer } from '../../components/role-authorizer';
import { useWebsocket } from '../../hooks/use-websocket';
import { getUserAndDivision, serverSideGetRequests } from '../../lib/utils/fetch';
import { useQueryParam } from '../../hooks/use-query-param';

interface Props {
  user: WithId<SafeUser>;
  member: WithId<Member>;
}

const Page: NextPage<Props> = ({ user, member }) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useQueryParam('tab', '1');

  const { socket, connectionStatus } = useWebsocket([
    // handle ws eventes
  ]);

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
            <Typography>Election Manager UI</Typography>

            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                console.log('loadVotingMember', member);

                socket.emit('loadVotingMember', member);
              }}
            >
              Load Voting Member
            </Button>
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
        member: '/api/events'
      },
      ctx
    );

    return { props: { user, ...data } };
  } catch {
    return { redirect: { destination: '/login', permanent: false } };
  }
};

export default Page;
