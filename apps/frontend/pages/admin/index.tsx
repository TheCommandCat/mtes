import { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import { Paper, Typography, Stack, ListItemButton, Tab, Tabs } from '@mui/material';
import { WithId } from 'mongodb';
import { ElectionEvent, User } from '@mtes/types';
import { serverSideGetRequests } from '../../lib/utils/fetch';
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

interface Props {
  user: WithId<User>;
  events: Array<WithId<ElectionEvent>>;
}

const Page: NextPage<Props> = ({ user, events }) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('1');
  const [event, setEvent] = useState<WithId<ElectionEvent> | null>(events[0] || null);

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
                onClick={() => router.push('/admin/event/create')}
              >
                צור אירוע
              </ListItemButton>
            </>
          ) : (
            <>
              <Typography variant="h2" textAlign={'center'}>
                בחירת אירוע
              </Typography>
              <TabContext value={activeTab}>
                <Paper sx={{ mt: 2 }}>
                  <Tabs
                    value={activeTab}
                    onChange={(_e, newValue: string) => setActiveTab(newValue)}
                    centered
                  >
                    <Tab label="פרטי האירוע" value="1" />
                    <Tab label="לוח זמנים" value="2" />
                    <Tab label="פרסים" value="3" />
                  </Tabs>
                </Paper>
                <TabPanel value="1">
                  <Stack spacing={2}>
                    {event && <EditDivisionForm event={event} />}
                    <Paper sx={{ p: 4 }}>
                      {event?.hasState && <DeleteDivisionData event={event} />}
                      <Stack justifyContent="center" direction="row" spacing={2}>
                        <UploadFileButton
                          urlPath={`/api/admin/events/schedule/parse`}
                          displayName="לוח זמנים"
                          extension=".csv"
                          disabled={event?.hasState}
                        />
                        {event && <GenerateScheduleButton event={event} />}
                        {event && <DownloadUsersButton event={event} disabled={!event?.hasState} />}
                      </Stack>
                    </Paper>
                    <Paper sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                      <UploadFileButton
                        urlPath={`/api/admin/events/pit-map`}
                        displayName="מפת פיטים"
                        extension=".png"
                      />
                    </Paper>
                  </Stack>
                </TabPanel>
                <TabPanel value="2">{event && <DivisionScheduleEditor event={event} />}</TabPanel>
                <TabPanel value="3">
                  {/* <DivisionAwardEditor divisionId={divisions[0]?._id} awardSchema={awardSchema} /> */}
                </TabPanel>
              </TabContext>
              <ListItemButton
                key={'create-division'}
                dense
                sx={{ borderRadius: 2, minHeight: '50px' }}
                // onClick={() => router.push('/admin/event')}
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
