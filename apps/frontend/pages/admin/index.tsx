import { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import {
  Paper,
  Typography,
  Stack,
  Button,
  Box,
  TextField,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import type { WithId } from 'mongodb';
import type { ElectionEvent, Member, User } from '@mtes/types';
import { apiFetch, serverSideGetRequests } from '../../lib/utils/fetch';
import Layout from '../../components/layout';
import { useState, useEffect } from 'react';
import { Formik, Form, FormikHelpers } from 'formik';
import FormikTextField from '../../components/general/forms/formik-text-field';
import Grid from '@mui/material/Grid2';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ErrorIcon from '@mui/icons-material/Error';
import { z } from 'zod';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import type { GetServerSidePropsContext } from 'next';
import UsersTable from 'apps/frontend/components/admin/users-table';

export const validationSchema = z.object({
  name: z.string().min(1, 'שם האירוע הוא שדה חובה'),
  votingStands: z.coerce
    .number({ required_error: 'מספר עמדות הצבעה הוא שדה חובה' })
    .min(1, 'לפחות עמדת הצבעה אחת נדרשת'),
  electionThreshold: z.coerce
    .number({ required_error: 'אחוז הכשירות הוא שדה חובה' })
    .min(0, 'אחוז הכשירות חייב להיות לפחות 0')
    .max(100, 'אחוז הכשירות לא יכול להיות יותר מ-100')
});

export type ValidationSchema = z.infer<typeof validationSchema>;

export interface PageProps {
  user: WithId<User>;
  event?: WithId<ElectionEvent & { members?: Array<{ name: string; city: string }> }>;
  initMembers?: Member[];
  credentials?: User[];
}

export interface FormValues extends ValidationSchema {}

const Page: NextPage<PageProps> = ({ user, event, initMembers, credentials }) => {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>(Array.isArray(initMembers) ? initMembers : []);
  const [currentTab, setCurrentTab] = useState(0);
  const [hasErrors, setHasErrors] = useState<{ event: boolean; members: boolean }>({
    event: false,
    members: false
  });

  const isValidMember = (member: Member) => member.name.trim() !== '' && member.city.trim() !== '';
  const validateMembers = (memberList: Member[]) => {
    if (!Array.isArray(memberList)) return false;
    if (!event && memberList.length === 0) return false;
    return memberList.every(isValidMember);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) =>
    setCurrentTab(newValue);

  const handleDelete = async () => {
    try {
      const res = await apiFetch('/api/admin/events/data', { method: 'DELETE' });
      if (!res.ok) throw new Error('http-error');
      await res.json();
      enqueueSnackbar('האירוע נמחק בהצלחה', { variant: 'success' });
      router.reload();
    } catch {
      enqueueSnackbar('אופס, לא הצלחנו למחוק את האירוע.', { variant: 'error' });
    }
  };

  const handleSubmit = async (values: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
    setSubmitting(true);
    if (!event && !validateMembers(members)) {
      setHasErrors(prev => ({ ...prev, members: true }));
      enqueueSnackbar('יש להזין לפחות חבר אחד עם שם ועיר', { variant: 'error' });
      setCurrentTab(1);
      setSubmitting(false);
      return;
    }
    const basePayload = {
      name: values.name,
      eventUsers: { 'election-manager': true, 'voting-stand': true },
      votingStands: values.votingStands,
      electionThreshold: values.electionThreshold,
      startDate: new Date(),
      endDate: new Date()
    };
    let finalPayload;
    if (event) {
      finalPayload = { ...basePayload, hasState: event.hasState };
    } else {
      finalPayload = { ...basePayload, hasState: true, members: members };
    }
    try {
      const res = await apiFetch('/api/admin/events', {
        method: event ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload)
      });
      if (!res.ok) throw new Error('http-error');
      await res.json();
      enqueueSnackbar(event ? 'האירוע עודכן בהצלחה' : 'האירוע נוצר בהצלחה', { variant: 'success' });
      router.reload();
    } catch {
      enqueueSnackbar(
        event ? 'אופס, לא הצלחנו לעדכן את האירוע.' : 'אופס, לא הצלחנו ליצור את האירוע.',
        { variant: 'error' }
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMembers = async (updatedMembers: Member[]) => {
    if (!validateMembers(updatedMembers)) {
      enqueueSnackbar('יש להזין שם ועיר לכל החברים', { variant: 'error' });
      return;
    }
    try {
      const res = await apiFetch('/api/events/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: updatedMembers })
      });
      if (!res.ok) throw new Error('http-error');
      await res.json();
      setMembers(updatedMembers);
      setHasErrors(prev => ({ ...prev, members: false }));
      enqueueSnackbar('החברים עודכנו בהצלחה', { variant: 'success' });
    } catch {
      enqueueSnackbar('אופס, לא הצלחנו לעדכן את החברים.', { variant: 'error' });
    }
  };

  const addMember = () => setMembers([...members, { name: '', city: 'תל אביב יפו' }]);
  const removeMember = (index: number) => {
    const newMembers = members.filter((_, i) => i !== index);
    setMembers(newMembers);
    setHasErrors(prev => ({ ...prev, members: !validateMembers(newMembers) }));
  };
  const updateMember = (index: number, field: keyof Member, value: string) => {
    const newMembers = [...members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setMembers(newMembers);
    setHasErrors(prev => ({ ...prev, members: !validateMembers(newMembers) }));
  };
  const getInitialValues = (): FormValues => ({
    name: event?.name || '',
    votingStands: event?.votingStands || 1,
    electionThreshold: event?.electionThreshold || 50
  });

  const renderMemberFields = () => (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        רשימת חברים
      </Typography>
      <Stack spacing={2}>
        {members.map((member, index) => (
          <Grid container spacing={2} key={index} alignItems="center">
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                fullWidth
                label="שם"
                value={member.name}
                onChange={e => updateMember(index, 'name', e.target.value)}
                required
                error={member.name.trim() === ''}
                helperText={member.name.trim() === '' ? 'שדה חובה' : ''}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                fullWidth
                label="רשות"
                value={member.city}
                onChange={e => updateMember(index, 'city', e.target.value)}
                required
                error={member.city.trim() === ''}
                helperText={member.city.trim() === '' ? 'שדה חובה' : ''}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }} sx={{ textAlign: { xs: 'right', sm: 'center' } }}>
              <IconButton onClick={() => removeMember(index)} color="error">
                <DeleteIcon />
              </IconButton>
            </Grid>
          </Grid>
        ))}
        <Button
          startIcon={<AddIcon />}
          onClick={addMember}
          variant="outlined"
          sx={{ alignSelf: 'flex-start' }}
        >
          הוסף חבר
        </Button>
      </Stack>
      {event && (
        <Button
          variant="contained"
          onClick={() => handleUpdateMembers(members)}
          disabled={!validateMembers(members)}
          sx={{ mt: 3 }}
          fullWidth
        >
          שמור שינויי חברים
        </Button>
      )}
    </Box>
  );

  const TabLabel = ({ label, hasError }: { label: string; hasError: boolean }) => (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <span>{label}</span>
      {hasError && <ErrorIcon color="error" fontSize="small" sx={{ ml: 1 }} />}
    </Box>
  );

  return (
    <Layout maxWidth="sm" title="ממשק ניהול">
      <Paper sx={{ p: { xs: 2, sm: 4 }, mt: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
          {event ? 'עריכת אירוע' : 'יצירת אירוע חדש'}
        </Typography>
        <Formik
          initialValues={getInitialValues()}
          onSubmit={handleSubmit}
          validationSchema={toFormikValidationSchema(validationSchema)}
          validateOnMount
        >
          {({ values, errors, touched, isSubmitting, setFieldValue }) => {
            useEffect(() => {
              setHasErrors(prev => ({
                ...prev,
                event: Object.keys(errors).length > 0
              }));
              if (Object.keys(errors).length > 0) {
                enqueueSnackbar('יש שגיאות בטופס. אנא בדוק את השדות שסומנו.', { variant: 'error' });
              }
            }, [errors]);
            useEffect(() => {
              if (!event) {
                setHasErrors(prev => ({ ...prev, members: !validateMembers(members) }));
              }
            }, [members, event]);
            return (
              <Form>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                  <Tabs value={currentTab} onChange={handleTabChange} centered variant="fullWidth">
                    <Tab label={<TabLabel label="פרטי אירוע" hasError={hasErrors.event} />} />
                    <Tab
                      label={
                        <TabLabel label="רשימת חברים" hasError={hasErrors.members && !event} />
                      }
                    />
                    {event && <Tab label={<TabLabel label="ניהול משתמשים" hasError={false} />} />}
                  </Tabs>
                </Box>
                {currentTab === 0 && (
                  <Box sx={{ mb: 4 }}>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, sm: 8 }}>
                        <FormikTextField
                          variant="outlined"
                          type="text"
                          name="name"
                          label="שם אירוע"
                          fullWidth
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <FormikTextField
                          variant="outlined"
                          type="number"
                          name="votingStands"
                          label="מספר עמדות"
                          fullWidth
                          required
                          inputProps={{ min: 1 }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormikTextField
                          variant="outlined"
                          type="number"
                          name="electionThreshold"
                          label="אחוז הכשירות לניצחון (%)"
                          fullWidth
                          required
                          inputProps={{ min: 0, max: 100, step: 0.1 }}
                          helperText="אחוז מינימלי של קולות הנדרש לקביעת מנצח"
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}
                {currentTab === 1 && <Box sx={{ mt: 2 }}>{renderMemberFields()}</Box>}
                {currentTab === 2 && event && (
                  <Box sx={{ mt: 3 }}>
                    {!credentials || credentials.length === 0 ? (
                      <Box
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        minHeight="200px"
                      >
                        <Paper sx={{ p: 3, textAlign: 'center', width: '100%', maxWidth: 'sm' }}>
                          <Typography variant="h6" color="text.secondary">
                            אין משתמשים להצגה.
                          </Typography>
                        </Paper>
                      </Box>
                    ) : (
                      <UsersTable users={credentials} />
                    )}
                  </Box>
                )}
                {!event && (
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    sx={{ mt: 4 }}
                    disabled={isSubmitting || hasErrors.event || hasErrors.members}
                  >
                    {isSubmitting ? 'יוצר אירוע...' : 'צור אירוע'}
                  </Button>
                )}
                {event && currentTab === 0 && (
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    sx={{ mt: 3 }}
                    disabled={isSubmitting || hasErrors.event}
                  >
                    {isSubmitting ? 'מעדכן אירוע...' : 'עדכן פרטי אירוע'}
                  </Button>
                )}
                {event && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: { xs: 2, sm: 3 },
                      mt: 4,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{ mb: 2, textAlign: 'center', fontWeight: 'medium' }}
                    >
                      פעולות נוספות
                    </Typography>
                    <Stack justifyContent="center" direction={{ xs: 'column', sm: 'row' }} gap={2}>
                      <Button variant="outlined" color="error" onClick={handleDelete} fullWidth>
                        מחק אירוע
                      </Button>
                    </Stack>
                  </Paper>
                )}
              </Form>
            );
          }}
        </Formik>
      </Paper>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const data = await serverSideGetRequests(
    {
      user: '/api/me',
      event: '/public/event',
      initMembers: '/api/events/members',
      credentials: '/api/admin/events/users/credentials'
    },
    ctx
  );
  return { props: data };
};

export default Page;
