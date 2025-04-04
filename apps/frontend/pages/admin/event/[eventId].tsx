import dayjs from 'dayjs';
import { useState } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import { TabContext, TabPanel } from '@mui/lab';
import { Paper, Tabs, Tab, Stack } from '@mui/material';
import { WithId } from 'mongodb';
import { ElectionEvent, Division, AwardSchema } from '@mtes/types';
import { apiFetch, serverSideGetRequests } from '../../../lib/utils/fetch';
import Layout from '../../../components/layout';
import GenerateScheduleButton from '../../../components/admin/generate-schedule';
import EditDivisionForm from '../../../components/admin/edit-division-form';
// import DivisionAwardEditor from '../../../components/admin/division-award-editor';
import DeleteDivisionData from '../../../components/admin/delete-division-data';
import DownloadUsersButton from '../../../components/admin/download-users';
import UploadFileButton from '../../../components/general/upload-file';

interface Props {
  event: WithId<ElectionEvent>;
  awardSchema: AwardSchema;
}

const Page: NextPage<Props> = ({ event }) => {
  const [activeTab, setActiveTab] = useState<string>('1');

  return (
    <Layout maxWidth="md" title={`ניהול אירוע: ${event.name}`} back="/admin">
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
            <EditDivisionForm event={event} />
            <Paper sx={{ p: 4 }}>
              {event?.hasState && <DeleteDivisionData event={event} />}
              <Stack justifyContent="center" direction="row" spacing={2}>
                <UploadFileButton
                  urlPath={`/api/admin/divisions/schedule/parse`}
                  displayName="לוח זמנים"
                  extension=".csv"
                  disabled={event?.hasState}
                />
                <GenerateScheduleButton event={event} />
                <DownloadUsersButton event={event} disabled={event?.hasState} />
              </Stack>
            </Paper>
            <Paper sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
              <UploadFileButton
                urlPath={`/api/admin/divisions/pit-map`}
                displayName="מפת פיטים"
                extension=".png"
              />
            </Paper>
          </Stack>
        </TabPanel>
        <TabPanel value="2">
          {/* <DivisionScheduleEditor event={event} /> */}
        </TabPanel>
        <TabPanel value="3">
          {/* <DivisionAwardEditor divisionId={divisions[0]?._id} awardSchema={awardSchema} /> */}
        </TabPanel>
      </TabContext>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async ctx => {
  const event = await apiFetch(`/api/events/${ctx.params?.eventId}`, undefined, ctx).then(res =>
    res?.json()
  );

  return { props: { event } };
};

export default Page;
