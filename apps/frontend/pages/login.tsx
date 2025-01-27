import { useState, useEffect } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import { Paper, Box, Link, Stack, Typography } from '@mui/material';
import Layout from '../components/layout';
import AdminLoginForm from '../components/general/login/admin-login-form';
import { Division, ElectionEvent, User } from '@mtes/types';
import { apiFetch } from '../lib/utils/fetch';
import { ObjectId, WithId } from 'mongodb';
import EventLoginForm from '../components/login/event-login-form';
import EventSelector from '../components/forms/event-selector';
import DivisionLoginForm from '../components/login/division-login-form';

interface PageProps {
  events: Array<WithId<ElectionEvent>>;
}

const Page: NextPage<PageProps> = ({ events }) => {
  const [isAdminLogin, setIsAdminLogin] = useState<boolean>(false);
  const [event, setEvent] = useState<WithId<ElectionEvent> | undefined>(undefined);
  const [division, setDivision] = useState<WithId<Division> | undefined>(undefined);

  const selectDivision = (eventId: string | ObjectId, divisionId?: string | ObjectId) => {
    const event = events.find(e => String(e._id) === String(eventId));
    if (!event) return;

    console.log('event', event);

    setEvent(event);

    if (!false) {
      setDivision(event.divisions?.[0]);
      return;
    }

    if (divisionId) {
      setDivision(event.divisions?.find(d => String(d._id) === String(divisionId)));
    }
  };

  return (
    <Layout maxWidth="sm">
      <Paper sx={{ p: 4, mt: 4 }}>
        {isAdminLogin ? (
          <AdminLoginForm />
        ) : event ? (
          <DivisionLoginForm
            event={event}
            division={division}
            onCancel={() => {
              setEvent(undefined);
              setDivision(undefined);
            }}
          />
        ) : (
          <>
            <h1>EventSelector</h1>
            <Stack direction="column">
              <Typography variant="h2" pb={2} textAlign={'center'}>
                בחירת אירוע
              </Typography>
              <EventSelector
                events={events}
                includeDivisions
                getEventDisabled={event =>
                  !!event.divisions && event.divisions.every(d => !d.hasState)
                }
                getDivisionDisabled={division => !division.hasState}
                onChange={selectDivision}
              />
            </Stack>
          </>
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

  const recaptchaRequired = process.env.RECAPTCHA === 'true';

  if (user) {
    return user.isAdmin
      ? { redirect: { destination: `/admin`, permanent: false } }
      : { redirect: { destination: `/lems`, permanent: false } };
  } else {
    return apiFetch('/public/events', undefined, ctx)
      .then(response => response.json())
      .then((events: Array<WithId<ElectionEvent>>) => {
        console.log('events', events);

        return { props: { events } };
      });
  }
};

export default Page;
