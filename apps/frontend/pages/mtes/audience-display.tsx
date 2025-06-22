import { useState } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import { WithId } from 'mongodb';
import { User, ElectionEvent, Member, Round, ElectionState } from '@mtes/types';
import { WaitingState } from 'apps/frontend/components/mtes/waiting-state';
import { useWebsocket } from 'apps/frontend/hooks/use-websocket';
import { getUserAndDivision, serverSideGetRequests } from 'apps/frontend/lib/utils/fetch';
import { Box, Grid, Typography } from '@mui/material';
import Layout from '../../components/layout';
import { MemberDisplay } from '../../components/mtes/member-display';

interface Props {
  user: WithId<User>;
  event: WithId<ElectionEvent>;
  electionState: WithId<ElectionState>;
  initialMembers: WithId<Member>[];
}

const Page: NextPage<Props> = ({ event, electionState, initialMembers }) => {
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
    }
    // {
    //   name: 'votingMemberLoaded',
    //   handler: (member: WithId<Member>, votingStand: number) => {
    //     setMembers(prevMembers =>
    //       prevMembers.map(m =>
    //         m._id.toString() === member._id.toString() ? { ...m, votingStand } : m
    //       )
    //     );
    //   }
    // }
  ]);

  if (!activeRound) {
    return (
      <Layout title={event.name}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            p: 4,
            gap: 3
          }}
        >
          <WaitingState
            title="No active round"
            subtitle="Please wait for the next round to begin"
          />
        </Box>
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
          p: 4,
          gap: 3
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
          {activeRound.name}
        </Typography>

        <Typography variant="h5" sx={{ color: 'text.secondary' }}>
          Roles: {activeRound.roles.map(role => role.role).join(' • ')}
        </Typography>

        <Box sx={{ mt: 2 }}>
          {electionState.audienceDisplay && (
            <Typography variant="h6" sx={{ color: 'primary.main' }}>
              {electionState.audienceDisplay}
            </Typography>
          )}
          {electionState.completed && (
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
              Election Completed
            </Typography>
          )}
        </Box>
        <Box sx={{ width: '100%', mt: 4 }}>
          <Grid container spacing={2}>
            {members
              .slice()
              .sort((a, b) => (a.isPresent === b.isPresent ? 0 : a.isPresent ? -1 : 1))
              .map(member => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={member._id.toString()}>
                  <MemberDisplay member={member} />
                </Grid>
              ))}
          </Grid>
        </Box>
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
