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
  Tab,
  MenuItem,
  Grid
} from '@mui/material';
import type { WithId } from 'mongodb';
import type { ElectionEvent, Member, User, City } from '@mtes/types';
import { apiFetch, serverSideGetRequests } from '../../lib/utils/fetch';
import Layout from '../../components/layout';
import { useState } from 'react';
import { Formik, Form, FieldArray, FormikHelpers } from 'formik';
import FormikTextField from '../../components/general/forms/formik-text-field';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ErrorIcon from '@mui/icons-material/Error';
import { z } from 'zod';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import type { GetServerSidePropsContext } from 'next';
import UsersTable from 'apps/frontend/components/admin/users-table';
import { enqueueSnackbar } from 'notistack';

// Define the shape of the entire form
const createValidationSchema = (isNewEvent: boolean) =>
  z
    .object({
      name: z.string().min(1, 'שם האירוע הוא שדה חובה'),
      votingStands: z.coerce
        .number({ required_error: 'מספר עמדות הצבעה הוא שדה חובה' })
        .min(1, 'לפחות עמדת הצבעה אחת נדרשת'),
      electionThreshold: z.coerce
        .number({ required_error: 'אחוז הכשירות הוא שדה חובה' })
        .min(0, 'אחוז הכשירות חייב להיות לפחות 0')
        .max(100, 'אחוז הכשירות לא יכול להיות יותר מ-100'),
      cities: z.array(
        z.object({
          name: z.string().min(1, 'שם העיר לא יכול להיות ריק'),
          numOfVoters: z.number()
        })
      ),
      members: z.array(
        z.object({
          name: z.string().min(1, 'שם החבר הוא שדה חובה'),
          city: z.string().min(1, 'יש לבחור עיר לחבר')
        })
      )
    })
    .refine(data => !isNewEvent || data.members.length > 0, {
      message: 'ליצירת אירוע חדש, יש להזין לפחות חבר אחד',
      path: ['members'] // Assign error to the members field
    })
    .refine(
      data => data.members.every(member => data.cities.some(city => city.name === member.city)),
      {
        message: 'חבר אחד או יותר משויך לעיר שאינה קיימת ברשימה',
        path: ['members'] // Assign error to the members field
      }
    );

export type FormValues = z.infer<ReturnType<typeof createValidationSchema>>;

export interface PageProps {
  user: WithId<User>;
  event?: WithId<ElectionEvent>;
  initMembers: Member[];
  initCities: City[];
  credentials: User[];
}

const Page: NextPage<PageProps> = ({ user, event, initMembers, initCities, credentials }) => {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState(0);
  const [newCityName, setNewCityName] = useState('');

  const isNewEvent = !event;
  const validationSchema = createValidationSchema(isNewEvent);

  const initialValues: FormValues = {
    name: event?.name || '',
    votingStands: event?.votingStands || 1,
    electionThreshold: event?.electionThreshold || 50,
    members: Array.isArray(initMembers) ? initMembers : [],
    cities: Array.isArray(initCities) ? initCities : []
  };

  const handleSubmit = async (values: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
    setSubmitting(true);

    // Helper to reduce repetition for API calls
    const updateEndpoint = async (
      endpoint: string,
      method: 'POST' | 'PUT',
      body: unknown,
      entityName: string
    ) => {
      const res = await apiFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        // Create a specific error message to be caught below
        throw new Error(errorData?.message || `An error occurred while updating ${entityName}.`);
      }
      return res.json();
    };

    try {
      // Step 1: Create or Update the main event details.
      // This must succeed before we proceed.
      const eventDetailsPayload = {
        name: values.name,
        votingStands: values.votingStands,
        electionThreshold: values.electionThreshold
      };
      await updateEndpoint(
        '/api/admin/events',
        event ? 'PUT' : 'POST',
        eventDetailsPayload,
        'event details'
      );

      // Step 2: Update the members list.
      // This is a PUT because we are replacing the entire list for an existing event.
      await updateEndpoint(
        '/api/events/members',
        'PUT',
        { members: values.members as Member[] },
        'members'
      );

      // Step 3: Update the cities list.
      await updateEndpoint(
        '/api/admin/events/cities',
        'PUT',
        { cities: values.cities as City[] },
        'cities'
      );

      // If all three requests succeed:
      enqueueSnackbar('האירוע נשמר בהצלחה', { variant: 'success' });
      router.reload();
    } catch (error: any) {
      // Catches any error thrown from updateEndpoint
      console.error('Failed to save event data:', error);
      enqueueSnackbar(error.message || 'אופס, אירעה שגיאה בלתי צפויה.', {
        variant: 'error'
      });
    } finally {
      // This will run regardless of success or failure
      setSubmitting(false);
    }
  };

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
          initialValues={initialValues}
          validationSchema={toFormikValidationSchema(validationSchema)}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, errors, touched, isSubmitting, setFieldValue }) => {
            const hasEventDetailsError = !!(
              (errors.name && touched.name) ||
              (errors.votingStands && touched.votingStands) ||
              (errors.electionThreshold && touched.electionThreshold)
            );
            // For arrays, we check if the error is a string (top-level) or an array (item-level)
            const hasMembersError = !!(errors.members && touched.members);
            const hasCitiesError = !!(errors.cities && touched.cities);

            const handleAddCity = () => {
              const trimmedName = newCityName.trim();
              if (trimmedName && !values.cities.some(c => c.name === trimmedName)) {
                setFieldValue('cities', [...values.cities, { name: trimmedName, numOfVoters: 0 }]);
                setNewCityName(''); // Clear input
              } else if (!trimmedName) {
                enqueueSnackbar('שם העיר אינו יכול להיות ריק.', {
                  variant: 'warning'
                });
              } else {
                enqueueSnackbar('עיר עם שם זה כבר קיימת.', {
                  variant: 'info'
                });
              }
            };

            const handleDeleteCity = (cityName: string) => {
              const updatedCities = values.cities.filter(city => city.name !== cityName);
              const updatedMembers = values.members.map(member =>
                member.city === cityName
                  ? { ...member, city: '' } // Reset city for affected members
                  : member
              );
              setFieldValue('cities', updatedCities);
              setFieldValue('members', updatedMembers);
            };

            const renderActionButtons = () => (
              <Stack
                direction="row"
                spacing={2}
                justifyContent="center"
                sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}
              >
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                  {event ? 'עדכן אירוע' : 'צור אירוע חדש'}
                </Button>
                {event && (
                  <Button
                    variant="outlined"
                    color="error"
                    // onClick={handleDelete}
                    disabled={isSubmitting}
                  >
                    מחק אירוע
                  </Button>
                )}
              </Stack>
            );

            return (
              <Form>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                  <Tabs
                    value={currentTab}
                    onChange={(_e, val) => setCurrentTab(val)}
                    centered
                    sx={{ mb: 2 }}
                  >
                    <Tab label={<TabLabel label="פרטי אירוע" hasError={hasEventDetailsError} />} />
                    <Tab label={<TabLabel label="ניהול חברים" hasError={hasMembersError} />} />
                    <Tab label={<TabLabel label="ניהול ערים" hasError={hasCitiesError} />} />
                    <Tab label="ניהול משתמשים" />
                  </Tabs>
                </Box>

                {currentTab === 0 && (
                  <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      פרטי אירוע
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <FormikTextField name="name" label="שם האירוע" fullWidth />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormikTextField
                          name="votingStands"
                          label="מספר עמדות הצבעה"
                          type="number"
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormikTextField
                          name="electionThreshold"
                          label="אחוז הכשירות (%)"
                          type="number"
                          fullWidth
                        />
                      </Grid>
                    </Grid>
                    {renderActionButtons()}
                  </Paper>
                )}

                {currentTab === 1 && (
                  <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      ניהול חברים
                    </Typography>
                    {typeof errors.members === 'string' && (
                      <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                        {errors.members}
                      </Typography>
                    )}
                    <FieldArray name="members">
                      {({ remove, push }) => (
                        <>
                          {values.members.map((_member, index) => (
                            <Grid
                              container
                              spacing={2}
                              key={index}
                              sx={{ mb: 2 }}
                              alignItems="center"
                            >
                              <Grid item xs={5}>
                                <FormikTextField
                                  name={`members.${index}.name`}
                                  label="שם חבר"
                                  fullWidth
                                />
                              </Grid>
                              <Grid item xs={5}>
                                <FormikTextField
                                  select
                                  name={`members.${index}.city`}
                                  label="עיר"
                                  fullWidth
                                >
                                  <MenuItem value="">
                                    <em>בחר עיר</em>
                                  </MenuItem>
                                  {values.cities.map(city => (
                                    <MenuItem key={city.name} value={city.name}>
                                      {city.name}
                                    </MenuItem>
                                  ))}
                                </FormikTextField>
                              </Grid>
                              <Grid item xs={2}>
                                <IconButton onClick={() => remove(index)}>
                                  <DeleteIcon />
                                </IconButton>
                              </Grid>
                            </Grid>
                          ))}
                          <Button
                            startIcon={<AddIcon />}
                            onClick={() =>
                              push({
                                name: '',
                                city: values.cities[0]?.name || ''
                              })
                            }
                            variant="outlined"
                          >
                            הוסף חבר
                          </Button>
                        </>
                      )}
                    </FieldArray>
                    {renderActionButtons()}
                  </Paper>
                )}

                {currentTab === 2 && (
                  <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      ניהול ערים
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                      <TextField
                        label="שם עיר חדשה"
                        value={newCityName}
                        onChange={e => setNewCityName(e.target.value)}
                        onKeyPress={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCity();
                          }
                        }}
                      />
                      <Button onClick={handleAddCity} variant="contained" startIcon={<AddIcon />}>
                        הוסף עיר
                      </Button>
                    </Stack>
                    {values.cities.map(city => (
                      <Paper
                        key={city.name}
                        elevation={1}
                        sx={{
                          p: 1,
                          mb: 1,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <Typography sx={{ flexGrow: 1 }}>{city.name}</Typography>
                        <IconButton
                          onClick={() => handleDeleteCity(city.name)}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Paper>
                    ))}
                    {renderActionButtons()}
                  </Paper>
                )}

                {currentTab === 3 && (
                  <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      ניהול משתמשים
                    </Typography>
                    <UsersTable users={credentials || []} />
                    {renderActionButtons()}
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

// No changes needed for getServerSideProps
export const getServerSideProps: GetServerSideProps<PageProps> = async (
  ctx: GetServerSidePropsContext
) => {
  const data = await serverSideGetRequests(
    {
      user: '/api/me',
      event: '/public/event',
      initMembers: '/api/events/members',
      initCities: '/api/admin/events/cities',
      credentials: '/api/admin/events/users/credentials'
    },
    ctx
  );

  console.log('Server-side data fetched:', {
    user: data.user,
    event: data.event,
    initMembers: data.initMembers,
    initCities: data.initCities,
    credentials: data.credentials
  });

  return {
    props: {
      user: data.user,
      event: data.event ?? null,
      initMembers: data.initMembers ?? [],
      initCities: data.initCities ?? [],
      credentials: data.credentials ?? []
    }
  };
};

export default Page;
