import { useState, useMemo } from 'react';
import { enqueueSnackbar } from 'notistack';
import { useRouter } from 'next/router';
import { GetServerSideProps, NextPage } from 'next';
import { WithId } from 'mongodb';
import { TabContext, TabPanel } from '@mui/lab';
import { Paper, Tabs, Tab, Typography, Box } from '@mui/material';
import { DivisionState, DivisionWithEvent, SafeUser } from '@mtes/types';
import Layout from '../../components/layout';
import { RoleAuthorizer } from '../../components/role-authorizer';
// import { useWebsocket } from '../../hooks/use-websocket';
import { localizedRoles } from '../../localization/roles';
import { getUserAndDivision, serverSideGetRequests } from '../../lib/utils/fetch';
import { useQueryParam } from '../../hooks/use-query-param';

interface Props {
  user: WithId<SafeUser>;
  division: WithId<DivisionWithEvent>;
  divisionState: WithId<DivisionState>;
}

const Page: NextPage<Props> = ({
  user,
  division: initialDivision,
  divisionState: initialDivisionState
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useQueryParam('tab', '1');
  const [division] = useState<WithId<DivisionWithEvent>>(initialDivision);
  const [divisionState, setDivisionState] = useState<WithId<DivisionState>>(initialDivisionState);

  // handel statments

  // socket
  //   const { socket, connectionStatus } = useWebsocket(
  //     division._id.toString(),
  //     ['pit-admin', 'field', 'judging'],
  //     undefined,
  //     [
  //     //   { name: 'name', handler: handler },

  //     ]
  //   );

  return (
    <RoleAuthorizer
      user={user}
      allowedRoles="voting-stand"
      onFail={() => {
        router.push(`/mtes/${user.role}`);
        enqueueSnackbar('לא נמצאו הרשאות מתאימות.', { variant: 'error' });
      }}
    >
      <Layout
        title={`ממשק ${user.role}`}
        // connectionStatus={connectionStatus}
        color={division.color}
      >
        <Box sx={{ mt: 2 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography>Voting Stand UI</Typography>
          </Paper>
        </Box>
      </Layout>
    </RoleAuthorizer>
  );
};

export const getServerSideProps: GetServerSideProps = async ctx => {
  try {
    const { user, divisionId } = await getUserAndDivision(ctx);

    const data = await serverSideGetRequests(
      {
        division: `/api/divisions/${divisionId}?withEvent=true`,
        divisionState: `/api/divisions/${divisionId}/state`,
        teams: `/api/divisions/${divisionId}/teams`,
        tickets: `/api/divisions/${divisionId}/tickets`,
        rooms: `/api/divisions/${divisionId}/rooms`,
        tables: `/api/divisions/${divisionId}/tables`,
        matches: `/api/divisions/${divisionId}/matches`,
        sessions: `/api/divisions/${divisionId}/sessions`,
        cvForms: `/api/divisions/${divisionId}/cv-forms`
      },
      ctx
    );

    return { props: { user, ...data } };
  } catch {
    return { redirect: { destination: '/login', permanent: false } };
  }
};

export default Page;
