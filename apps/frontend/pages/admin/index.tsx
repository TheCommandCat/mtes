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
  Grid,
  Select,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel
} from '@mui/material';
import type { WithId } from 'mongodb';
import type { ElectionEvent, Member, User, City } from '@mtes/types';
import { apiFetch, serverSideGetRequests } from '../../lib/utils/fetch';
import Layout from '../../components/layout';
import { useState } from 'react';
import { Formik, Form, FieldArray, FormikHelpers, Field } from 'formik';
import FormikTextField from '../../components/general/forms/formik-text-field';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ErrorIcon from '@mui/icons-material/Error';
import { z } from 'zod';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import type { GetServerSidePropsContext } from 'next';
import UsersTable from 'apps/frontend/components/admin/users-table';
import { enqueueSnackbar } from 'notistack';

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
          numOfVoters: z.coerce.number().min(0, 'מספר המצביעים חייב להיות לפחות 0')
        })
      ),
      members: z.array(
        z.object({
          _id: z.string().optional(),
          name: z.string().min(1, 'שם החבר הוא שדה חובה'),
          city: z.string().min(1, 'יש לבחור עיר לחבר'),
          isMM: z.boolean().optional(),
          isPresent: z.boolean().optional()
        })
      )
    })
    .refine(data => !isNewEvent || data.members.length > 0, {
      message: 'ליצירת אירוע חדש, יש להזין לפחות חבר אחד',
      path: ['members']
    })
    .refine(
      data => data.members.every(member => data.cities.some(city => city.name === member.city)),
      {
        message: 'חבר אחד או יותר משויך לעיר שאינה קיימת ברשימה',
        path: ['members']
      }
    )
    .refine(
      data => {
        const cityCounts = data.cities.reduce((acc, city) => {
          acc[city.name] = city.numOfVoters;
          return acc;
        }, {} as Record<string, number>);

        const memberCountsByCity: Record<string, number> = {};
        for (const member of data.members) {
          if (!member.isMM) {
            memberCountsByCity[member.city] = (memberCountsByCity[member.city] || 0) + 1;
            if (memberCountsByCity[member.city] > (cityCounts[member.city] || 0)) {
              return false;
            }
          }
        }
        return true;
      },
      {
        message:
          'מספר הנציגים בעיר אינו יכול לעלות על מספר המצביעים שהוגדר לאותה עיר. חברים נוספים מאותה עיר יסומנו אוטומטית כממלאי מקום.',
        path: ['members']
      }
    );

export type FormValues = z.infer<ReturnType<typeof createValidationSchema>>;

export interface PageProps {
  user: WithId<User>;
  event?: WithId<ElectionEvent>;
  initMembers: WithId<Member>[];
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
    members: Array.isArray(initMembers)
      ? initMembers.map(m => ({
          _id: m._id.toString(),
          name: m.name,
          city: m.city,
          isMM: m.isMM || false,
          isPresent: m.isPresent || false
        }))
      : [],
    cities: Array.isArray(initCities) ? initCities : []
  };

  const handleSubmit = async (values: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
    setSubmitting(true);

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
        throw new Error(errorData?.message || `An error occurred while updating ${entityName}.`);
      }
      return res.json();
    };

    try {
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

      await updateEndpoint('/api/events/members', 'PUT', { members: values.members }, 'members');

      await updateEndpoint(
        '/api/admin/events/cities',
        'PUT',
        { cities: values.cities as City[] },
        'cities'
      );

      enqueueSnackbar('האירוע נשמר בהצלחה', { variant: 'success' });
      router.reload();
    } catch (error: any) {
      enqueueSnackbar(error.message || 'אופס, אירעה שגיאה בלתי צפויה.', {
        variant: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event?._id) return;

    const confirmed = confirm('האם אתה בטוח שברצונך למחוק את האירוע? פעולה זו אינה ניתנת לביטול.');
    if (!confirmed) return;

    try {
      const res = await apiFetch(`/api/admin/events/data`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || 'An error occurred while deleting the event.');
      }

      enqueueSnackbar('האירוע נמחק בהצלחה', { variant: 'success' });
      router.push('/admin');
    } catch (error: any) {
      enqueueSnackbar(error.message || 'אופס, אירעה שגיאה בלתי צפויה.', { variant: 'error' });
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
            const hasMembersError = !!(errors.members && touched.members);
            const hasCitiesError = !!(errors.cities && touched.cities);

            const handleAddCity = () => {
              const trimmedName = newCityName.trim();
              if (trimmedName && !values.cities.some(c => c.name === trimmedName)) {
                setFieldValue('cities', [...values.cities, { name: trimmedName, numOfVoters: 0 }]);
                setNewCityName('');
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
                    onClick={handleDelete}
                    variant="outlined"
                    color="error"
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
                              <Grid item xs={12} sm={4}>
                                <FormikTextField
                                  name={`members.${index}.name`}
                                  label="שם חבר"
                                  fullWidth
                                />
                              </Grid>
                              <Grid item xs={12} sm={3}>
                                <FormControl fullWidth>
                                  <InputLabel id={`city-select-label-${index}`}>עיר</InputLabel>
                                  <Field
                                    as={Select}
                                    name={`members[${index}].city`}
                                    labelId={`city-select-label-${index}`}
                                    label="עיר"
                                    required
                                  >
                                    {values.cities.map(city => (
                                      <MenuItem key={city.name} value={city.name}>
                                        {city.name}
                                      </MenuItem>
                                    ))}
                                  </Field>
                                </FormControl>
                              </Grid>
                              <Grid item xs={12} sm={3}>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={_member.isMM || false}
                                      onChange={e => {
                                        const newIsMM = e.target.checked;
                                        let finalIsMM = newIsMM;

                                        if (newIsMM === false) {
                                          const cityOfMember = values.members[index].city;
                                          const cityConfig = values.cities.find(
                                            c => c.name === cityOfMember
                                          );
                                          const maxVotersForCity = cityConfig
                                            ? cityConfig.numOfVoters
                                            : 0;

                                          let otherNonMMCountInCity = 0;
                                          values.members.forEach((m, idx) => {
                                            if (
                                              idx !== index &&
                                              m.city === cityOfMember &&
                                              !m.isMM
                                            ) {
                                              otherNonMMCountInCity++;
                                            }
                                          });

                                          if (otherNonMMCountInCity + 1 > maxVotersForCity) {
                                            finalIsMM = true;
                                            enqueueSnackbar(
                                              `הגעת למכסת הנציגים המקסימלית (${maxVotersForCity}) עבור ${cityOfMember}. החבר "${values.members[index].name}" סומן כממלא מקום.`,
                                              { variant: 'warning' }
                                            );
                                          }
                                        }
                                        setFieldValue(`members[${index}].isMM`, finalIsMM);
                                      }}
                                    />
                                  }
                                  label={_member.isMM ? 'מ"מ' : 'נציג'}
                                  sx={{ justifyContent: 'flex-start' }}
                                />
                              </Grid>
                              <Grid
                                item
                                xs={12}
                                sm={2}
                                sx={{ textAlign: { xs: 'left', sm: 'right' } }}
                              >
                                <IconButton onClick={() => remove(index)} color="error">
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
                    <FieldArray name="cities">
                      {cityFieldArrayHelpers => (
                        <>
                          {values.cities.map((city, index) => (
                            <Paper key={index} elevation={2} sx={{ p: 2, mb: 2 }}>
                              <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={5}>
                                  <FormikTextField
                                    name={`cities[${index}].name`}
                                    label="שם עיר"
                                    fullWidth
                                    disabled={
                                      !isNewEvent && initCities.some(c => c.name === city.name)
                                    }
                                  />
                                </Grid>
                                <Grid item xs={12} sm={5}>
                                  <FormikTextField
                                    name={`cities[${index}].numOfVoters`}
                                    label="מספר מצביעים"
                                    type="number"
                                    fullWidth
                                  />
                                </Grid>
                                <Grid
                                  item
                                  xs={12}
                                  sm={2}
                                  sx={{ textAlign: { xs: 'left', sm: 'right' } }}
                                >
                                  <IconButton
                                    onClick={() => cityFieldArrayHelpers.remove(index)}
                                    color="error"
                                    disabled={
                                      !isNewEvent && initCities.some(c => c.name === city.name)
                                    }
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Grid>
                              </Grid>
                            </Paper>
                          ))}
                        </>
                      )}
                    </FieldArray>
                    {renderActionButtons()}
                  </Paper>
                )}

                {currentTab === 3 && (
                  <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      ניהול משתמשים
                    </Typography>
                    <UsersTable users={credentials} />
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
