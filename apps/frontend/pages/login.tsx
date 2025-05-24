import { useState, useEffect } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import {
  Paper,
  Box,
  Link,
  Stack,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
} from '@mui/material';
import Layout from '../components/layout';
import AdminLoginForm from '../components/general/login/admin-login-form';
import { ElectionEvent, User } from '@mtes/types';
import { apiFetch } from '../lib/utils/fetch'; // serverSideGetRequests removed
import DivisionLoginForm from '../components/login/division-login-form';

// LoginProps no longer needs event
interface LoginProps {}

const Page: NextPage<LoginProps> = () => {
  const [isAdminLogin, setIsAdminLogin] = useState<boolean>(false);
  const [events, setEvents] = useState<ElectionEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [eventError, setEventError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoadingEvents(true);
      setEventError(null);
      try {
        const response = await apiFetch('/api/events/active-events');
        if (response.ok) {
          const data: ElectionEvent[] = await response.json();
          setEvents(data);
          if (data.length === 1) { // Auto-select if only one event
            setSelectedEventId(data[0]._id);
          }
        } else {
          const errorData = await response.json();
          setEventError(errorData.message || 'Failed to load events.');
          setEvents([]);
        }
      } catch (error) {
        console.error('Fetch events error:', error);
        setEventError('An unexpected error occurred while fetching events.');
        setEvents([]);
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchEvents();
  }, []);

  const selectedEvent = events.find(e => e._id === selectedEventId);

  return (
    <Layout maxWidth="sm">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom align="center">
          התחברות למערכת
        </Typography>

        {isLoadingEvents && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress />
          </Box>
        )}

        {eventError && (
          <Alert severity="error" sx={{ my: 2 }}>
            {eventError}
          </Alert>
        )}

        {!isLoadingEvents && !eventError && events.length > 0 && (
          <FormControl fullWidth sx={{ my: 2 }}>
            <InputLabel id="event-select-label">בחירת אירוע</InputLabel>
            <Select
              labelId="event-select-label"
              id="event-select"
              value={selectedEventId}
              label="בחירת אירוע"
              onChange={e => setSelectedEventId(e.target.value as string)}
            >
              {events.map(event => (
                <MenuItem key={event._id} value={event._id}>
                  {event.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {!isLoadingEvents && !eventError && events.length === 0 && (
          <Typography align="center" sx={{ my: 2 }}>
            לא נמצאו אירועים פעילים.
          </Typography>
        )}

        {selectedEventId && (
          <>
            {isAdminLogin ? (
              <AdminLoginForm eventId={selectedEventId} />
            ) : (
              <DivisionLoginForm
                eventId={selectedEventId}
                votingStands={selectedEvent?.votingStands ?? 0}
              />
            )}
          </>
        )}
      </Paper>

      {selectedEventId && ( // Only show login type toggle if an event is selected
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
      )}
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async ctx => {
  // User check remains the same
  const user: User = await apiFetch('/api/me', undefined, ctx).then(response => {
    return response.ok ? response.json() : undefined;
  });

  // Removed /public/event fetch
  // const data = await serverSideGetRequests(
  //   {
  //     event: '/public/event'
  //   },
  //   ctx
  // );

  if (user) {
    return user.isAdmin
      ? { redirect: { destination: `/admin`, permanent: false } }
      : { redirect: { destination: `/mtes`, permanent: false } };
  } else {
    // No event data to pass in props anymore
    return { props: {} };
  }
};

export default Page;
