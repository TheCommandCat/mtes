import { useState, useEffect } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import { Paper, Box, Link, Stack, Typography } from '@mui/material';
import Layout from '../components/layout';
// import EventLoginForm from '@/components/';
// import { WithId } from 'mongodb';

interface PageProps {
  recaptchaRequired: boolean;
}

const Page: NextPage<PageProps> = ({ recaptchaRequired }) => {
  const [isAdminLogin, setIsAdminLogin] = useState<boolean>(false);

  return (
    <Layout maxWidth="sm">
      <Paper sx={{ p: 4, mt: 4 }}>
        {isAdminLogin ? (
          <Typography variant="h2" pb={2} textAlign={'center'}>
            מנהל
          </Typography>
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

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  return { props: { recaptchaRequired: false } };
};

export default Page;
