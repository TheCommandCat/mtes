import { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import { Paper, Typography, Stack, ListItemButton, Tab, Tabs } from '@mui/material';
import { WithId } from 'mongodb';
import { ElectionEvent, EventUserAllowedRoles, User } from '@mtes/types';
import { apiFetch, serverSideGetRequests } from '../../lib/utils/fetch';
import Layout from '../../components/layout';
import EventSelector from '../../components/general/event-selector';
import { TabContext, TabPanel } from '@mui/lab';
import DivisionScheduleEditor from 'apps/frontend/components/admin/division-schedule-editor';
import UploadFileButton from 'apps/frontend/components/general/upload-file';
import GenerateScheduleButton from 'apps/frontend/components/admin/generate-schedule';
import DownloadUsersButton from 'apps/frontend/components/admin/download-users';
import EditDivisionForm from 'apps/frontend/components/admin/edit-division-form';
import { useState } from 'react';
import DeleteDivisionData from 'apps/frontend/components/admin/delete-division-data';
import dayjs from 'dayjs';
import { enqueueSnackbar } from 'notistack';

interface Props {
  user: WithId<User>;
  events: Array<WithId<ElectionEvent>>;
}

const Page: NextPage<Props> = ({ user, events }) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('1');
  const [event, setEvent] = useState<WithId<ElectionEvent> | null>(events[0] || null);

  const handleCreate = () => {
    console.log(
      JSON.stringify({
        name: 'אירוע חדש',
        eventUsers: { 'election-manager': true, 'voting-stand': true },
        hasState: false,
        startDate: dayjs(),
        endDate: dayjs()
      })
    );

    apiFetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'אירוע חדש',
        eventUsers: { 'election-manager': true, 'voting-stand': true },
        hasState: false,
        startDate: dayjs(),
        endDate: dayjs()
      })
    })
      .then(res => {
        if (res.ok) {
          return res.json();
        } else {
          throw 'http-error';
        }
      })
      .then(() => router.reload())
      .catch(() => enqueueSnackbar('אופס, לא הצלחנו ליצור את האירוע.', { variant: 'error' }));
  };

  const handleDelete = () => {
    console.log('deleting event');

    apiFetch('/api/admin/events/data', { method: 'DELETE' })
      .then(res => {
        if (res.ok) {
          return res.json();
        } else {
          throw 'http-error';
        }
      })
      .then(() => router.reload())
      .catch(() => enqueueSnackbar('אופס, לא הצלחנו למחוק את האירוע.', { variant: 'error' }));
  };

  console.log('events', events);

  return (
    <Layout maxWidth="sm" title="ממשק ניהול">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Stack direction="column" spacing={2}>
          {events.length === 0 ? (
            <>
              <Typography variant="h5" textAlign="center">
                אין אירועים קיימים
              </Typography>
              <ListItemButton
                key={'create-division'}
                dense
                sx={{ borderRadius: 2, minHeight: '50px' }}
                onClick={() => handleCreate()}
              >
                צור אירוע
              </ListItemButton>
            </>
          ) : (
            <>
              <Typography variant="h2" textAlign={'center'}>
                בחירת אירוע
              </Typography>

              <Stack>
                {event && <EditDivisionForm event={event} />}
                <Paper sx={{ p: 4 }}>
                  {event?.hasState && <DeleteDivisionData event={event} />}
                  <Stack justifyContent="center" direction="row" gap={2}>
                    <UploadFileButton
                      urlPath={`/api/admin/events/schedule/parse`}
                      displayName="קובץ תצורה"
                      extension=".csv"
                      disabled={event?.hasState}
                    />
                    {event && <DownloadUsersButton event={event} disabled={!event?.hasState} />}
                  </Stack>
                </Paper>
              </Stack>
              <ListItemButton
                key={'create-division'}
                dense
                sx={{ borderRadius: 2, minHeight: '50px' }}
                onClick={() => handleDelete()}
              >
                מחק אירוע
              </ListItemButton>
            </>
          )}
        </Stack>
      </Paper>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async ctx => {
  const data = await serverSideGetRequests({ user: '/api/me', events: '/public/events' }, ctx);
  return { props: data };
};

export default Page;
