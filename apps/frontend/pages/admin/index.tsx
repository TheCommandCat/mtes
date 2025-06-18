import { useState } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import type { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { Paper, Typography, Stack, Button, Box, Tabs, Tab } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import { enqueueSnackbar } from 'notistack';
import { Formik, Form, FormikHelpers, getIn } from 'formik';
import { z } from 'zod';
import { toFormikValidationSchema } from 'zod-formik-adapter';

import type { WithId } from 'mongodb';
import type { ElectionEvent, Member, User, City } from '@mtes/types';

import { apiFetch, serverSideGetRequests } from '../../lib/utils/fetch';
import Layout from '../../components/layout';
import UsersTable from '../../components/admin/users-table';
import EventDetailsForm from '../../components/admin/EventDetailsForm';
import MembersManagementForm from '../../components/admin/MembersManagementForm';
import CitiesManagementForm from '../../components/admin/CitiesManagementForm';

const memberFormSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, 'שם החבר הוא שדה חובה'),
  city: z.string().min(1, 'יש לבחור עיר לחבר'),
  isPresent: z.boolean().optional().default(false)
});

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
      regularMembers: z.array(memberFormSchema),
      mmMembers: z.array(memberFormSchema)
    })
    .refine(data => !isNewEvent || data.regularMembers.length + data.mmMembers.length > 0, {
      message: 'ליצירת אירוע חדש, יש להזין לפחות חבר אחד (נציג או מ"מ)',
      path: ['regularMembers'] // Or a general path
    })
    .refine(
      data => {
        const allMembers = [...data.regularMembers, ...data.mmMembers];
        return allMembers.every(member => data.cities.some(city => city.name === member.city));
      },
      {
        message: 'חבר אחד או יותר משויך לעיר שאינה קיימת ברשימה',
        path: ['regularMembers'] // Or a general path
      }
    )
    .refine(
      data => {
        const cityConfigs = data.cities.reduce((acc, city) => {
          acc[city.name] = city.numOfVoters;
          return acc;
        }, {} as Record<string, number>);

        for (const city of data.cities) {
          const regularMembersInCityCount = data.regularMembers.filter(
            m => m.city === city.name
          ).length;
          if (regularMembersInCityCount > (cityConfigs[city.name] || 0)) {
            return false;
          }
        }
        return true;
      },
      {
        message:
          'מספר הנציגים בעיר אינו יכול לעלות על מספר המצביעים שהוגדר לאותה עיר. יש להעביר חברים עודפים לרשימת ממלאי מקום.',
        path: ['regularMembers']
      }
    );

export type FormValues = z.infer<ReturnType<typeof createValidationSchema>>;

export interface PageProps {
  user: WithId<User>;
  event?: WithId<ElectionEvent>;
  initMembers: WithId<Member>[]; // These are regular members (isMM: false or undefined)
  initMMMembers: WithId<Member>[]; // These are MM members (isMM: true)
  initCities: City[];
  credentials: User[];
}

const Page: NextPage<PageProps> = ({
  user,
  event,
  initMembers,
  initMMMembers,
  initCities,
  credentials
}) => {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState(0);

  const isNewEvent = !event;
  const validationSchema = createValidationSchema(isNewEvent);

  const initialValues: FormValues = {
    name: event?.name || '',
    votingStands: event?.votingStands || 1,
    electionThreshold: event?.electionThreshold || 50,
    regularMembers: Array.isArray(initMembers)
      ? initMembers
          .filter(m => !m.isMM) // Ensure only non-MM members (isMM is false or undefined)
          .map(m => ({
            _id: m._id.toString(),
            name: m.name,
            city: m.city,
            isPresent: m.isPresent || false
          }))
      : [],
    mmMembers: Array.isArray(initMMMembers)
      ? initMMMembers
          .filter(m => m.isMM === true) // Ensure only explicitly MM members
          .map(m => ({
            _id: m._id.toString(),
            name: m.name,
            city: m.city,
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

      const regularMembersPayload = values.regularMembers.map(m => ({
        ...m,
        isMM: false,
        isPresent: m.isPresent || false
      }));
      const mmMembersPayload = values.mmMembers.map(m => ({
        ...m,
        isMM: true,
        isPresent: m.isPresent || false
      }));

      await updateEndpoint(
        '/api/events/members',
        'PUT',
        { members: regularMembersPayload },
        'members'
      );

      // Send MM members to a different endpoint
      if (mmMembersPayload.length > 0 || event) {
        // Always send MM members if event exists, even if empty to clear them
        await updateEndpoint(
          '/api/events/mm-members',
          'PUT',
          { mmMembers: mmMembersPayload },
          'MM members'
        );
      }

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
    <Layout maxWidth="md" title="ממשק ניהול">
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
            const hasMembersError = !!(
              (getIn(errors, 'regularMembers') && getIn(touched, 'regularMembers')) ||
              (getIn(errors, 'mmMembers') && getIn(touched, 'mmMembers'))
            );
            const hasCitiesError = !!(errors.cities && touched.cities);

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

                {currentTab === 0 && <EventDetailsForm renderActionButtons={renderActionButtons} />}

                {currentTab === 1 && (
                  <Stack spacing={3}>
                    <MembersManagementForm
                      title="ניהול נציגים"
                      membersFieldName="regularMembers"
                      values={values}
                      errors={errors}
                      setFieldValue={setFieldValue}
                      renderActionButtons={null} // Buttons rendered once below
                      isMMList={false}
                    />
                    <MembersManagementForm
                      title="ניהול ממלאי מקום"
                      membersFieldName="mmMembers"
                      values={values}
                      errors={errors}
                      setFieldValue={setFieldValue}
                      renderActionButtons={null} // Buttons rendered once below
                      isMMList={true}
                    />
                    {/* Render action buttons once after both member forms */}
                    {renderActionButtons()}
                  </Stack>
                )}

                {currentTab === 2 && (
                  <CitiesManagementForm
                    values={values}
                    setFieldValue={setFieldValue}
                    renderActionButtons={renderActionButtons}
                    isNewEvent={isNewEvent}
                    initCities={initCities}
                  />
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
      initMembers: '/api/events/members', // Fetches non-MM members
      initMMMembers: '/api/events/mm-members', // Fetches MM members
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
      initMMMembers: data.initMMMembers ?? [], // Ensure this is correctly populated
      initCities: data.initCities ?? [],
      credentials: data.credentials ?? []
    }
  };
};

export default Page;
