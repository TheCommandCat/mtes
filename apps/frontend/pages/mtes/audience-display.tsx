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
import AudienceRoundDisplay from 'apps/frontend/components/mtes/audience/audience-round-display';
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
            <AudienceRoundDisplay activeRound={activeRound} />
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
