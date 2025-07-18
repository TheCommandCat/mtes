import { GetServerSideProps, NextPage } from 'next';
import type { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Stack,
  Button,
  Box,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import { enqueueSnackbar } from 'notistack';
import { Formik, Form, FormikHelpers, getIn } from 'formik';
import { z } from 'zod';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import type { WithId } from 'mongodb';
import type { ElectionEvent, Member, User, City } from '@mtes/types';
import { apiFetch, getUserAndDivision, serverSideGetRequests } from '../../lib/utils/fetch';
import Layout from '../../components/layout';
import UsersTable from '../../components/admin/users-table';
import EventDetailsForm from '../../components/admin/EventDetailsForm';
import MembersManagementForm from '../../components/admin/MembersManagementForm';
import CitiesManagementForm from '../../components/admin/CitiesManagementForm';
import ChangePasswordDialog from '../../components/admin/ChangePasswordDialog';

const memberFormSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, 'שם החבר הוא שדה חובה'),
  city: z.string().min(1, 'יש לבחור מוסד שולח לחבר'),
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
          name: z.string().min(1, 'שם המוסד השולח לא יכול להיות ריק'),
          numOfVoters: z.coerce.number().min(0, 'מספר המצביעים חייב להיות לפחות 0')
        })
      ),
      regularMembers: z.array(memberFormSchema),
      mmMembers: z.array(memberFormSchema)
    })
    .refine(data => !isNewEvent || data.regularMembers.length + data.mmMembers.length > 0, {
      message: 'ליצירת אירוע חדש, יש להזין לפחות חבר אחד (נציג או מ"מ)',
      path: ['regularMembers']
    })
    .refine(
      data => {
        const allMembers = [...data.regularMembers, ...data.mmMembers];
        return allMembers.every(member => data.cities.some(city => city.name === member.city));
      },
      {
        message: 'חבר אחד או יותר משויך למוסד שולח שאינה קיימת ברשימה',
        path: ['regularMembers']
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
          'מספר הנציגים במוסד השולח אינו יכול לעלות על מספר המצביעים שהוגדר לאותה מוסד שולח. יש להעביר חברים עודפים לרשימת ממלאי מקום.',
        path: ['regularMembers']
      }
    );

export type FormValues = z.infer<ReturnType<typeof createValidationSchema>>;

const Page: NextPage = () => {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState(0);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const validationSchema = createValidationSchema(true);

  const initialValues: FormValues = {
    name: '',
    votingStands: 1,
    electionThreshold: 50,
    regularMembers: [],
    mmMembers: [],
    cities: []
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
      const eventId = await updateEndpoint(
        '/api/admin/events',
        'POST',
        eventDetailsPayload,
        'event details'
      );
      console.log(`Event created with ID: ${eventId}`);

      const regularMembersPayload = values.regularMembers.map(m => ({
        ...m,
        isMM: false,
        isPresent: m.isPresent || false,
        eventId
      }));
      const mmMembersPayload = values.mmMembers.map(m => ({
        ...m,
        isMM: true,
        isPresent: m.isPresent || false,
        eventId
      }));
      await updateEndpoint(
        '/api/events/members',
        'PUT',
        { members: regularMembersPayload },
        'members'
      );
      if (mmMembersPayload.length > 0) {
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
      enqueueSnackbar('האירוע נוצר בהצלחה', { variant: 'success' });
      router.push('/admin');
    } catch (error: any) {
      enqueueSnackbar(error.message || 'אופס, אירעה שגיאה בלתי צפויה.', {
        variant: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout maxWidth="md" title="יצירת אירוע חדש">
      <Paper sx={{ p: { xs: 2, sm: 4 }, mt: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
          יצירת אירוע חדש
        </Typography>
        <Formik
          initialValues={initialValues}
          validationSchema={toFormikValidationSchema(validationSchema)}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, isSubmitting, setFieldValue }) => (
            <Form>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs
                  value={currentTab}
                  onChange={(_e, val) => setCurrentTab(val)}
                  centered
                  sx={{ mb: 2 }}
                >
                  <Tab label="פרטי אירוע" />
                  <Tab label="ניהול ערים" />
                  <Tab label="ניהול חברים" />
                </Tabs>
              </Box>
              {currentTab === 0 && <EventDetailsForm renderActionButtons={() => <></>} />}
              {currentTab === 1 && (
                <CitiesManagementForm
                  values={values}
                  setFieldValue={setFieldValue}
                  renderActionButtons={() => <></>}
                  isNewEvent={true}
                  initCities={values.cities}
                />
              )}
              {currentTab === 2 && (
                <Stack spacing={3}>
                  <MembersManagementForm
                    title="ניהול נציגים"
                    membersFieldName="regularMembers"
                    values={values}
                    errors={errors}
                    setFieldValue={setFieldValue}
                    renderActionButtons={null}
                    isMMList={false}
                  />
                  <MembersManagementForm
                    title="ניהול ממלאי מקום"
                    membersFieldName="mmMembers"
                    values={values}
                    errors={errors}
                    setFieldValue={setFieldValue}
                    renderActionButtons={null}
                    isMMList={true}
                  />
                </Stack>
              )}
              <Stack
                direction="row"
                spacing={2}
                justifyContent="center"
                sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}
              >
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                  צור אירוע חדש
                </Button>
              </Stack>
            </Form>
          )}
        </Formik>
      </Paper>
      <ChangePasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
      />
    </Layout>
  );
};

export default Page;
