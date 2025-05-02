import { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import { Paper, Typography, Stack, Button, Box, TextField, IconButton } from '@mui/material';
import { WithId } from 'mongodb';
import { ElectionEvent, User } from '@mtes/types';
import { apiFetch, serverSideGetRequests } from '../../lib/utils/fetch';
import Layout from '../../components/layout';
import DownloadUsersButton from '../../components/admin/download-users';
import { useState } from 'react';
import dayjs from 'dayjs';
import { enqueueSnackbar } from 'notistack';
import { Formik, Form } from 'formik';
import FormikTextField from '../../components/general/forms/formik-text-field';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Grid from '@mui/material/Grid2';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

interface Props {
  user: WithId<User>;
  event?: WithId<ElectionEvent & { members?: Array<{ name: string; city: string }> }>;
}

interface Member {
  name: string;
  city: string;
}

const Page: NextPage<Props> = ({ user, event }) => {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>(event?.members || [{ name: '', city: '' }]);

  const handleSubmit = (values: any) => {
    const payload = {
      name: values.name,
      eventUsers: { 'election-manager': true, 'voting-stand': true },
      hasState: true,
      votingStandsIds: Array.from({ length: values.votingStands }, (_, i) => i + 1),
      startDate: values.startDate.toDate(),
      endDate: values.endDate.toDate(),
      members: members.filter(m => m.name && m.city)
    };

    apiFetch('/api/admin/events', {
      method: event ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event ? { ...payload, hasState: event.hasState } : payload)
    })
      .then(res => {
        if (res.ok) {
          return res.json();
        } else {
          throw 'http-error';
        }
      })
      .then(() => {
        enqueueSnackbar(event ? 'האירוע עודכן בהצלחה' : 'האירוע נוצר בהצלחה', {
          variant: 'success'
        });
        router.reload();
      })
      .catch(() =>
        enqueueSnackbar(
          event ? 'אופס, לא הצלחנו לעדכן את האירוע.' : 'אופס, לא הצלחנו ליצור את האירוע.',
          { variant: 'error' }
        )
      );
  };

  const handleDelete = () => {
    apiFetch('/api/admin/events/data', { method: 'DELETE' })
      .then(res => {
        if (res.ok) {
          return res.json();
        } else {
          throw 'http-error';
        }
      })
      .then(() => {
        enqueueSnackbar('האירוע נמחק בהצלחה', { variant: 'success' });
        router.reload();
      })
      .catch(() => enqueueSnackbar('אופס, לא הצלחנו למחוק את האירוע.', { variant: 'error' }));
  };

  const addMember = () => {
    setMembers([...members, { name: '', city: '' }]);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, field: keyof Member, value: string) => {
    const newMembers = [...members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setMembers(newMembers);
  };

  const getInitialValues = () => ({
    name: event?.name || '',
    startDate: event ? dayjs(event.startDate) : dayjs(),
    endDate: event ? dayjs(event.endDate) : dayjs(),
    votingStands: event?.votingStandsIds?.length || 1
  });

  const renderMemberFields = () => (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        רשימת חברים
      </Typography>
      <Stack spacing={2}>
        {members.map((member, index) => (
          <Grid container spacing={2} key={index} alignItems="center">
            <Grid size={5}>
              <TextField
                fullWidth
                label="שם"
                value={member.name}
                onChange={e => updateMember(index, 'name', e.target.value)}
              />
            </Grid>
            <Grid size={5}>
              <TextField
                fullWidth
                label="עיר"
                value={member.city}
                onChange={e => updateMember(index, 'city', e.target.value)}
              />
            </Grid>
            <Grid size={2}>
              <IconButton onClick={() => removeMember(index)} color="error">
                <DeleteIcon />
              </IconButton>
            </Grid>
          </Grid>
        ))}
        <Button startIcon={<AddIcon />} onClick={addMember}>
          הוסף חבר
        </Button>
      </Stack>
    </Box>
  );

  return (
    <Layout maxWidth="sm" title="ממשק ניהול">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Formik initialValues={getInitialValues()} onSubmit={handleSubmit}>
          {({ values, setFieldValue }) => (
            <Form>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Grid container rowGap={3} columnSpacing={3} p={2}>
                  <Grid size={12}>
                    <Typography variant="h5" gutterBottom>
                      {event ? 'עריכת אירוע' : 'יצירת אירוע חדש'}
                    </Typography>
                  </Grid>
                  <Grid size={12}>
                    <FormikTextField
                      variant="outlined"
                      type="text"
                      name="name"
                      label="שם אירוע"
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid size={6}>
                    <DatePicker
                      label="תאריך התחלה"
                      value={values.startDate}
                      onChange={newDate => {
                        setFieldValue('startDate', newDate, true);
                        setFieldValue('endDate', newDate, true);
                      }}
                      format="DD/MM/YYYY"
                      sx={{ width: '100%' }}
                    />
                  </Grid>
                  <Grid size={6}>
                    <DatePicker
                      label="תאריך סיום"
                      value={values.endDate}
                      onChange={newDate => setFieldValue('endDate', newDate, true)}
                      format="DD/MM/YYYY"
                      sx={{ width: '100%' }}
                    />
                  </Grid>
                  <Grid size={12}>
                    <FormikTextField
                      variant="outlined"
                      type="number"
                      name="votingStands"
                      label="מספר עמדות הצבעה"
                      fullWidth
                      required
                      inputProps={{ min: 1 }}
                    />
                  </Grid>
                  {renderMemberFields()}
                  <Grid size={12}>
                    <Button type="submit" variant="contained" fullWidth>
                      {event ? 'עדכן אירוע' : 'צור אירוע'}
                    </Button>
                  </Grid>
                </Grid>
              </LocalizationProvider>
            </Form>
          )}
        </Formik>
        {event && (
          <Box sx={{ mt: 4 }}>
            <Stack spacing={2}>
              <Paper sx={{ p: 4 }}>
                <Stack justifyContent="center" direction="row" gap={2}>
                  <DownloadUsersButton event={event} disabled={!event?.hasState} />
                </Stack>
              </Paper>
              <Button variant="outlined" color="error" onClick={handleDelete} sx={{ mt: 2 }}>
                מחק אירוע
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async ctx => {
  const data = await serverSideGetRequests({ user: '/api/me', event: '/public/event' }, ctx);
  return { props: data };
};

export default Page;
