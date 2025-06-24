import { useState } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import { WithId } from 'mongodb';
import { User, ElectionEvent, Member, Round, ElectionState } from '@mtes/types';
import { WaitingState } from 'apps/frontend/components/mtes/waiting-state';
import { useWebsocket } from 'apps/frontend/hooks/use-websocket';
import { getUserAndDivision, serverSideGetRequests } from 'apps/frontend/lib/utils/fetch';
import { Box, Typography, Grid, Paper, Container, Avatar } from '@mui/material';
import Layout from '../../components/layout';
import { AudiencePresence } from 'apps/frontend/components/mtes/audience/audience-presence';

interface Props {
  user: WithId<User>;
  event: WithId<ElectionEvent>;
  electionState: WithId<ElectionState>;
  initialMembers: WithId<Member>[];
}

const Page: NextPage<Props> = ({ event, electionState, initialMembers }) => {
  const [currentDisplay, setCurrentDisplay] = useState<'round' | 'presence' | 'voting'>('round');
  const [activeRound, setActiveRound] = useState<WithId<Round> | null>(electionState.activeRound);
  const [members, setMembers] = useState<WithId<Member>[]>(initialMembers);

  useWebsocket([
    {
      name: 'roundLoaded',
      handler: (newRound: WithId<Round>) => {
        setActiveRound(newRound);
      }
    },
    {
      name: 'memberPresenceUpdated',
      handler: (
        memberId: string,
        isMM: boolean,
        isPresent: boolean,
        replacedBy: WithId<Member> | null
      ) => {
        setMembers(prevMembers =>
          prevMembers.map(member =>
            member._id.toString() === memberId ? { ...member, isMM, isPresent, replacedBy } : member
          )
        );
      }
    },
    {
      name: 'audienceDisplayUpdated',
      handler: (view: 'round' | 'presence' | 'voting') => {
        setCurrentDisplay(view);
      }
    }
  ]);

  if (!activeRound) {
    return (
      <Layout title={event.name}>
        <Container maxWidth="sm" sx={{ pt: 8, pb: 4, display: 'flex', justifyContent: 'center' }}>
          <WaitingState title="אין סיבוב פעיל" subtitle="יש להמתין לסיבוב הבא" />
        </Container>
      </Layout>
    );
  }
  return (
    <Layout title={event.name}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: { xs: 2, sm: 4 },
          gap: 3,
          background: 'linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)',
          minHeight: '100vh'
        }}
      >
        {currentDisplay === 'presence' ? (
          <AudiencePresence
            members={members}
            isLoading={!members.length}
            isError={false}
            errorMessage="טעינת החברים נכשלה"
          />
        ) : currentDisplay === 'round' ? (
          <Paper
            elevation={3}
            sx={{
              width: '100%',
              maxWidth: '1200px',
              p: { xs: 2, sm: 4 },
              background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
              borderRadius: 3,
              border: '1px solid rgba(0, 0, 0, 0.12)'
            }}
          >
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              color="primary"
              sx={{
                textAlign: 'center',
                mb: 4,
                fontWeight: 'bold',
                textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {activeRound.name}
            </Typography>
            <Grid container spacing={4}>
              {activeRound.roles.map((roleConfig, index) => (
                <Grid item xs={12} key={index}>
                  <Box sx={{ mb: 4 }}>
                    <Typography
                      variant="h4"
                      component="h2"
                      sx={{
                        mb: 3,
                        color: 'text.primary',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        '&::before, &::after': {
                          content: '""',
                          flex: 1,
                          borderBottom: '2px solid',
                          borderImage:
                            'linear-gradient(to right, transparent, #1976d2, transparent) 1',
                          mx: 2
                        }
                      }}
                    >
                      {roleConfig.role}
                    </Typography>
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{ mb: 2, textAlign: 'center' }}
                    >
                      מקסימום קולות: {roleConfig.maxVotes}
                      {' | '}
                      קולות לבנים: {roleConfig.numWhiteVotes}
                    </Typography>
                    <Typography
                      variant="h6"
                      component="h3"
                      gutterBottom
                      sx={{
                        textAlign: 'center',
                        color: 'text.secondary',
                        mb: 3
                      }}
                    >
                      מתמודדים:
                    </Typography>
                    <Grid container spacing={3} justifyContent="center">
                      {roleConfig.contestants.map(contestant => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={contestant._id.toString()}>
                          <Paper
                            elevation={2}
                            sx={{
                              p: 2,
                              textAlign: 'center',
                              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-5px)',
                                boxShadow: 6
                              },
                              borderRadius: 2
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 80,
                                height: 80,
                                margin: '0 auto 16px',
                                bgcolor: 'primary.main',
                                fontSize: '2.5rem'
                              }}
                            >
                              {contestant.name.charAt(0)}
                            </Avatar>
                            <Typography variant="h6" fontWeight="bold">
                              {contestant.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {contestant.city}
                            </Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        ) : (
          <Box sx={{ width: '100%' }}>
            <Typography variant="h4" gutterBottom>
              אין מה להציג
            </Typography>
          </Box>
        )}
      </Box>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async ctx => {
  try {
    const { user } = await getUserAndDivision(ctx);

    const data = await serverSideGetRequests(
      {
        event: `/public/event`,
        electionState: `/api/events/state`,
        initialMembers: `/api/events/members`
      },
      ctx
    );

    if (!data.event) {
      return { notFound: true };
    }

    return { props: { user, ...data } };
  } catch (error) {
    console.error('Error fetching audience display data:', error);
    return { redirect: { destination: '/login', permanent: false } };
  }
};

export default Page;
