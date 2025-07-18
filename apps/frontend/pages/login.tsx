import { useState, useEffect } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import { Paper, Box, Link, Stack, Typography } from '@mui/material';
import Layout from '../components/layout';
import AdminLoginForm from '../components/general/login/admin-login-form';
import { ElectionEvent, User } from '@mtes/types';
import { apiFetch, serverSideGetRequests } from '../lib/utils/fetch';
import DivisionLoginForm from '../components/login/event-login-form';
import EventSelector from '../components/forms/event-selector';
import { ObjectId, WithId } from 'mongodb';

interface LoginProps {
  events: WithId<ElectionEvent>[];
  defaultEvent?: WithId<ElectionEvent>;
}

const Page: NextPage<LoginProps> = ({ events, defaultEvent }) => {
  const [isAdminLogin, setIsAdminLogin] = useState<boolean>(false);
  const [event, setEvent] = useState<WithId<ElectionEvent> | null>(null);

  const handleEventSelect = (eventId: string | ObjectId) => {
    const event = events.find(e => String(e._id) === String(eventId));
    if (event) {
      setEvent(event);
    }
  };

  // if (!events || events.length === 0) {
  //   return (
  //     <Layout maxWidth="sm">
  //       <Paper sx={{ p: 4, mt: 4, textAlign: 'center' }}>
  //         <Typography variant="h6" color="error" gutterBottom>
  //           אין אירועים זמינים
  //         </Typography>
  //         <Typography variant="body2" color="text.secondary">
  //           אנא פנה למנהל המערכת
  //         </Typography>
  //       </Paper>
  //     </Layout>
  //   );
  // }

  return (
    <Layout maxWidth="sm">
      <Paper sx={{ p: 4, mt: 4, textAlign: 'center' }}>
        {isAdminLogin ? (
          <AdminLoginForm />
        ) : event ? (
          <DivisionLoginForm
            votingStands={event.votingStands}
            eventId={event._id}
            onCancel={() => setEvent(null)}
          />
        ) : (
          <Stack direction="column">
            <Typography variant="h2" pb={2} textAlign={'center'}>
              בחירת אירוע
            </Typography>
            <EventSelector events={events} onChange={handleEventSelect} />
          </Stack>
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

  try {
    const data = await serverSideGetRequests(
      {
        events: '/public/events',
        defaultEvent: '/public/event'
      },
      ctx
    );

    if (user) {
      return user.isAdmin
        ? { redirect: { destination: `/admin`, permanent: false } }
        : { redirect: { destination: `/mtes`, permanent: false } };
    } else {
      // Ensure events is always an array
      const events = Array.isArray(data.events) ? data.events : [];
      return {
        props: {
          events,
          defaultEvent: data.defaultEvent
        }
      };
    }
  } catch (error) {
    console.error('Error fetching events:', error);

    if (user) {
      return user.isAdmin
        ? { redirect: { destination: `/admin`, permanent: false } }
        : { redirect: { destination: `/mtes`, permanent: false } };
    } else {
      return {
        props: {
          events: [],
          defaultEvent: null
        }
      };
    }
  }
};

export default Page;
