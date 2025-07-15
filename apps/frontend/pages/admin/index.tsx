import { useRouter } from 'next/router';
import { GetServerSideProps, NextPage } from 'next';
import type { GetServerSidePropsContext } from 'next';
import {
  Paper,
  Typography,
  Stack,
  Button,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText
} from '@mui/material';
import Layout from '../../components/layout';
import type { WithId } from 'mongodb';
import type { ElectionEvent, User } from '@mtes/types';
import { getUserAndDivision, serverSideGetRequests } from '../../lib/utils/fetch';
import z from 'zod';

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
      path: ['regularMembers'] // Or a general path
    })
    .refine(
      data => {
        const allMembers = [...data.regularMembers, ...data.mmMembers];
        return allMembers.every(member => data.cities.some(city => city.name === member.city));
      },
      {
        message: 'חבר אחד או יותר משויך למוסד שולח שאינה קיימת ברשימה',
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
          'מספר הנציגים במוסד השולח אינו יכול לעלות על מספר המצביעים שהוגדר לאותה מוסד שולח. יש להעביר חברים עודפים לרשימת ממלאי מקום.',
        path: ['regularMembers']
      }
    );

export interface PageProps {
  user: WithId<User>;
  events: WithId<ElectionEvent>[];
}

const Page: NextPage<PageProps> = ({ user, events }) => {
  const router = useRouter();

  const handleEventClick = (eventId: string) => {
    router.push(`/admin/${eventId}`);
  };

  const handleCreateClick = () => {
    router.push('/admin/create');
  };

  return (
    <Layout maxWidth="md" title="בחירת אירוע">
      <Paper sx={{ p: { xs: 2, sm: 4 }, mt: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
          בחר אירוע לניהול
        </Typography>
        <Stack spacing={3}>
          <Button variant="contained" color="primary" onClick={handleCreateClick}>
            צור אירוע חדש
          </Button>
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              אירועים קיימים:
            </Typography>
            {events.length === 0 ? (
              <Typography color="text.secondary">לא נמצאו אירועים.</Typography>
            ) : (
              <List>
                {events.map(event => (
                  <ListItem key={event._id.toString()} disablePadding>
                    <ListItemButton onClick={() => handleEventClick(event._id.toString())}>
                      <ListItemText primary={event.name} secondary={`ID: ${event._id}`} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Stack>
      </Paper>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (
  ctx: GetServerSidePropsContext
) => {
  const { user } = await getUserAndDivision(ctx);
  const data = await serverSideGetRequests(
    {
      user: '/api/me',
      events: '/public/events'
    },
    ctx
  );
  return {
    props: {
      user: data.user,
      events: data.events ?? []
    }
  };
};

export default Page;
