import { useMemo, useRef, useState } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import { WithId } from 'mongodb';
import { enqueueSnackbar } from 'notistack';
import { User, ElectionEvent, Member, Round, ElectionState, VotingState } from '@mtes/types';
import { ActiveRound } from 'apps/frontend/components/mtes/active-round';
import AudienceDisplayContainer from 'apps/frontend/components/mtes/audience/audience-display-container';
import { RoundPreview } from 'apps/frontend/components/mtes/round-preview';
import { RoundResults } from 'apps/frontend/components/mtes/round-results';
import { WaitingState } from 'apps/frontend/components/mtes/waiting-state';
import { useWebsocket } from 'apps/frontend/hooks/use-websocket';
import { getUserAndDivision, serverSideGetRequests } from 'apps/frontend/lib/utils/fetch';
import { Box, Typography } from '@mui/material';
import Layout from '../../components/layout';

interface Props {
  user: WithId<User>;
  event: WithId<ElectionEvent>;
  electionState: WithId<ElectionState>;
  initialMembers: WithId<Member>[];
}

const Page: NextPage<Props> = ({ user, event, electionState, initialMembers }) => {
  const router = useRouter();

  const [activeRound, setActiveRound] = useState<WithId<Round> | null>(electionState.activeRound);
  const [members, setMembers] = useState<WithId<Member>[]>(initialMembers);
  const [votingState, setVotingState] = useState<VotingState>('pending');

  useWebsocket([
    {
      name: 'roundLoaded',
      handler: (newRound: WithId<Round>) => {
        setActiveRound(newRound);
      }
    },
    {
      name: 'votingMemberLoaded',
      handler: (updatedMember: WithId<Member>) => {
        setMembers(currentMembers =>
          currentMembers.map(m => (m._id === updatedMember._id ? updatedMember : m))
        );
      }
    }
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
          {electionState.activeRound.name}
        </Typography>

        <Typography variant="h5" sx={{ color: 'text.secondary' }}>
          Roles: {electionState.activeRound.roles.map(role => role.role).join(' • ')}
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
        initialMembers: `/api/members/event-members`
      },
      ctx
    );

    console.log(data);

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
