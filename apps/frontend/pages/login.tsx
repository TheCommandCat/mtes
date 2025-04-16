import { useState, useEffect } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import { Paper, Box, Link, Stack, Typography } from '@mui/material';
import Layout from '../components/layout';
import AdminLoginForm from '../components/general/login/admin-login-form';
import { ElectionEvent, User } from '@mtes/types';
import { apiFetch, serverSideGetRequests } from '../lib/utils/fetch';
import DivisionLoginForm from '../components/login/division-login-form';

interface LoginProps {
  event?: ElectionEvent;
}

const Page: NextPage<LoginProps> = ({ event }) => {
  const [isAdminLogin, setIsAdminLogin] = useState<boolean>(false);

  return (
    <Layout maxWidth="sm">
      <Paper sx={{ p: 4, mt: 4 }}>
        {isAdminLogin ? (
          <AdminLoginForm />
        ) : (
          <DivisionLoginForm votingStands={event?.votingStandsIds} />
        )}
      </Paper>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          mt: 1.5
        }}
      >
        <Link
          underline="none"
          component="button"
          onClick={() => {
            setIsAdminLogin(!isAdminLogin);
          }}
        >
          {isAdminLogin ? 'כניסת מתנדבים' : 'התחברות כמנהל'}
        </Link>
      </Box>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async ctx => {
  const user: User = await apiFetch('/api/me', undefined, ctx).then(response => {
    return response.ok ? response.json() : undefined;
  });

  const data = await serverSideGetRequests(
    {
      event: '/public/event'
    },
    ctx
  );

  if (user) {
    return user.isAdmin
      ? { redirect: { destination: `/admin`, permanent: false } }
      : { redirect: { destination: `/mtes`, permanent: false } };
  } else {
    return { props: { ...data } };
  }
};

export default Page;
