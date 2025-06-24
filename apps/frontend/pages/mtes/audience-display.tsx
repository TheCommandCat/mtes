import { useEffect, useState } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import { WithId } from 'mongodb';
import {
  User,
  ElectionEvent,
  Member,
  Round,
  ElectionState,
  AudienceDisplayScreen,
  VotingStandStatus,
  VotingStates,
  VotingStatus
} from '@mtes/types';
import { WaitingState } from 'apps/frontend/components/mtes/waiting-state';
import { useWebsocket } from 'apps/frontend/hooks/use-websocket';
import { apiFetch, getUserAndDivision, serverSideGetRequests } from 'apps/frontend/lib/utils/fetch';
import { Box, Typography, Grid, Paper, Container, Avatar } from '@mui/material';
import Layout from '../../components/layout';
import { AudiencePresence } from 'apps/frontend/components/mtes/audience/audience-presence';
import { AudienceVotingDisplay } from 'apps/frontend/components/mtes/audience/audience-voting-display';
import { enqueueSnackbar } from 'notistack';
import AudienceDisplayContainer from 'apps/frontend/components/mtes/audience/audience-display-container';
import { RoleAuthorizer } from 'apps/frontend/components/role-authorizer';
import { useRouter } from 'next/router';

interface Props {
  user: WithId<User>;
  event: WithId<ElectionEvent>;
  electionState: WithId<ElectionState>;
  initialMembers: WithId<Member>[];
}

const initialRoundStatuses = (
  numofStands: number,
  status: VotingStates
): Record<number, VotingStandStatus> =>
  Object.fromEntries(
    Array.from({ length: numofStands }, (_, i) => [i + 1, { status: status, member: null }])
  ) as Record<number, VotingStandStatus>;

const Page: NextPage<Props> = ({ user, event, electionState, initialMembers }) => {
  const [currentDisplay, setCurrentDisplay] = useState<AudienceDisplayScreen>(
    (electionState.audienceDisplay as AudienceDisplayScreen) || 'round'
  );
  // static info screen - currentDisplay remains fixed from server

  const [activeRound, setActiveRound] = useState<WithId<Round> | null>(electionState.activeRound);
  const [members, setMembers] = useState<WithId<Member>[]>(initialMembers);
  const [votedMembers, setVotedMembers] = useState<WithId<VotingStatus>[]>([]);
  const [standStatuses, setStandStatuses] = useState<Record<number, VotingStandStatus>>(
    initialRoundStatuses(event.votingStands, event == null ? 'NotStarted' : 'Empty')
  );

  const router = useRouter();

  const refreshVotedMembers = async (roundId: string) => {
    const response = await apiFetch(`/api/events/rounds/votedMembers/${roundId}`, {
      method: 'GET'
    });
    if (response.ok) {
      const data = await response.json();
      setVotedMembers(data.votedMembers);
    } else {
      console.error('Error fetching voted members:', response.statusText);
    }
  };

  useEffect(() => {
    if (activeRound) {
      refreshVotedMembers(activeRound._id.toString());
    }
  }, [activeRound]);

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
    },
    {
      name: 'votingMemberLoaded',
      handler: (member: WithId<Member>, stand: number) => {
        setStandStatuses(prevStatuses => ({
          ...prevStatuses,
          [stand]: { status: 'Voting', member }
        }));
      }
    },
    {
      name: 'voteProcessed',
      handler: (votingMember: WithId<Member>, standId: number) => {
        enqueueSnackbar(`הצבעת ${votingMember.name} עובדה בהצלחה בעמדה ${standId}`, {
          variant: 'success'
        });
        setStandStatuses(prev => ({
          ...prev,
          [standId]: { status: 'Empty', member: null }
        }));
        refreshVotedMembers(activeRound?._id.toString() || '');
      }
    }
  ]);

  return (
    <RoleAuthorizer
      user={user}
      allowedRoles="audience-display"
      onFail={() => {
        router.push(`/mtes/${user.role}`);
        enqueueSnackbar('לא נמצאו הרשאות מתאימות.', { variant: 'error' });
      }}
    >
      <AudienceDisplayContainer>
        {/* Header with event title */}
        <Box
          sx={{ py: 2, textAlign: 'center', background: theme => theme.palette.background.paper }}
        >
          <Typography variant="h4" fontWeight="bold">
            {event.name}
          </Typography>
        </Box>

        {/* main content area */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            p: { xs: 2, sm: 4 },
            gap: 3,
            background: theme => theme.palette.background.default,
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
            activeRound ? (
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
              <Container
                maxWidth="sm"
                sx={{ pt: 8, pb: 4, display: 'flex', justifyContent: 'center' }}
              >
                <WaitingState title="אין סיבוב פעיל" subtitle="יש להמתין לסיבוב הבא" />
              </Container>
            )
          ) : currentDisplay === 'voting' ? (
            <AudienceVotingDisplay
              standStatuses={standStatuses}
              members={members}
              votedMembers={votedMembers}
            />
          ) : (
            <Box sx={{ width: '100%' }}>
              <Typography variant="h4" gutterBottom>
                אין מה להציג
              </Typography>
            </Box>
          )}
        </Box>
      </AudienceDisplayContainer>
    </RoleAuthorizer>
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
