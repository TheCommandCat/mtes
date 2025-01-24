import { useState, useEffect } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import { Paper, Box, Link, Stack, Typography } from '@mui/material';
import Layout from '../components/layout';
import AdminLoginForm from '../components/general/login/admin-login-form';
import { ElectionEvent, User } from '@mtes/types';
import { apiFetch } from '../lib/utils/fetch';
import { WithId } from 'mongodb';

interface PageProps {
  events: Array<WithId<ElectionEvent>>;
}

const Page: NextPage<PageProps> = ({ }) => {
  const [isAdminLogin, setIsAdminLogin] = useState<boolean>(false);

  return (
    <Layout maxWidth="sm">
      <Paper sx={{ p: 4, mt: 4 }}>
        {isAdminLogin ? (
          <AdminLoginForm/>
        ) : (
          <Stack direction="column">
            <Typography variant="h2" pb={2} textAlign={'center'}>
              בחירת אירוע
            </Typography>
            {/* <EventLoginForm recaptchaRequired={recaptchaRequired} /> */}
          </Stack>
        )}
      </Paper>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          mt: 1.5,
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

  if (user) {
    return user.isAdmin
      ? { redirect: { destination: `/admin`, permanent: false } }
      : { redirect: { destination: `/lems`, permanent: false } };
  } else {
    return apiFetch('/public/events', undefined, ctx)
      .then(response => response.json())
      .then((events: Array<WithId<ElectionEvent>>) => {
        return { props: { events } };
      });
  }
};

export default Page;
