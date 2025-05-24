import { useReducer, useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import { useRouter } from 'next/router';
import { GetServerSideProps, NextPage } from 'next';
import { WithId } from 'mongodb';
import { Paper, Typography, Box } from '@mui/material';
import { ElectionState, Member, SafeUser, Round } from '@mtes/types';
import Layout from '../../components/layout';
import { RoleAuthorizer } from '../../components/role-authorizer';
import { apiFetch, getUserAndDivision, serverSideGetRequests } from '../../lib/utils/fetch';
import { useWebsocket } from 'apps/frontend/hooks/use-websocket';
import { MemberDisplay } from '../../components/mtes/member-display';
import { VotingForm } from '../../components/mtes/voting-form';
import { WaitingState } from '../../components/mtes/waiting-state';
import { VotingRoundHeader } from '../../components/mtes/voting-round-header';
import { localizedRoles } from 'apps/frontend/localization/roles';

interface Props {
  user: WithId<SafeUser>;
  electionState: WithId<ElectionState>; // This includes eventId
}

const Page: NextPage<Props> = ({ user, electionState }) => {
  const router = useRouter();
  const [round, setRound] = useState<WithId<Round> | null>(electionState?.activeRound || null);
  const [member, setMember] = useState<WithId<Member> | null>(null);
  const eventId = electionState?.eventId?.toString(); // Get eventId from electionState
  const votingStandId = user.roleAssociation?.value;

  // Early return if no voting stand ID is assigned
  if (!votingStandId) {
    return (
      <RoleAuthorizer
        user={user}
        allowedRoles="voting-stand"
        onFail={() => {
          router.push(`/mtes/${user.role}`);
          enqueueSnackbar('לא נמצאו הרשאות מתאימות.', { variant: 'error' });
        }}
      >
        <Layout title={`ממשק ${user.role}`} connectionStatus="disconnected">
          <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
            <Paper elevation={2} sx={{ mt: 3, p: 4 }}>
              <WaitingState title="לא נמצאה עמדת הצבעה" subtitle="אנא פנה למנהל המערכת" error />
            </Paper>
          </Box>
        </Layout>
      </RoleAuthorizer>
    );
  }

  function handleUpdateMember(memberData: Member, votingStand: number) {
    if (votingStandId === votingStand) {
      setMember(memberData as WithId<Member>);
    }
  }

  const handleVoteComplete = () => {
    setMember(null); // Reset member for next voter
  };

  const { socket, connectionStatus } = useWebsocket(eventId, [ // Pass eventId to useWebsocket
    {
      name: 'votingMemberLoaded',
      handler: handleUpdateMember
    },
    {
      name: 'roundLoaded',
      handler: (newRound: WithId<Round>) => {
        setRound(newRound);
        setMember(null);
      }
    }
  ]);

  return (
    <RoleAuthorizer
      user={user}
      allowedRoles="voting-stand"
      onFail={() => {
        router.push(`/mtes/${user.role}`);
        enqueueSnackbar('לא נמצאו הרשאות מתאימות.', { variant: 'error' });
      }}
    >
      <Layout
        title={`ממשק ${user.role && localizedRoles[user.role]} - עמדה ${
          user.roleAssociation?.value
        }`}
        connectionStatus={connectionStatus}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              textAlign: 'center',
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              color: 'white'
            }}
          >
            <Typography variant="h4" fontWeight="bold">
              מערכת הצבעה
            </Typography>
          </Paper>

          <Paper elevation={2} sx={{ mt: 3, p: 4 }}>
            {round ? (
              <>
                <VotingRoundHeader roundName={round.name} />

                {member ? (
                  <>
                    <MemberDisplay member={member} />
                    <VotingForm
                      eventId={eventId} // Pass eventId to VotingForm
                      round={round}
                      member={member}
                      votingStandId={votingStandId}
                      socket={socket}
                      onVoteComplete={handleVoteComplete}
                    />
                  </>
                ) : (
                  <WaitingState title="מחכה למצביע...." subtitle="נא להמתין עד שיזוהה המצביע הבא" />
                )}
              </>
            ) : (
              <WaitingState title="אין תצורת הצבעה זמינה" subtitle="אנא פנה למנהל המערכת" error />
            )}
          </Paper>
        </Box>
      </Layout>
    </RoleAuthorizer>
  );
};

export const getServerSideProps: GetServerSideProps = async ctx => {
  try {
    const { user } = await getUserAndDivision(ctx); // This needs to provide eventId or user.eventId
    
    // Assuming getUserAndDivision or the session context now makes eventId available
    // For this example, we'll assume electionState is correctly fetched for the current event context
    // If not, this getServerSideProps would need modification to get the eventId from the user's session (JWT)
    // and then fetch the specific electionState for that event.

    if (!user?.eventId) { // A placeholder check, ideally, eventId comes from JWT or initial login context
        console.warn("No eventId found for user in session during voting-stand SSR. Redirecting to login.");
        return { redirect: { destination: '/login', permanent: false } };
    }

    const data = await serverSideGetRequests(
      {
        // Fetch electionState specific to the eventId from the user's context
        electionState: `/api/events/state` // This endpoint is now event-scoped by middleware
      },
      ctx // ctx will have the cookie for the middleware to extract eventId
    );
    
    if (!data.electionState) {
        // This means the event state for the user's current event couldn't be fetched.
        // This could happen if the event has no state yet, or if there's an issue.
        // For robustness, we might want to create a default/empty state or handle appropriately.
        console.warn(`No election state found for event ${user.eventId}. User might need to select event or admin needs to init.`);
        // Depending on desired behavior, either redirect or provide a default state.
        // For now, we'll let it pass and the component will handle null electionState.
        // Or redirect if it's critical:
        // return { redirect: { destination: '/login?error=event_state_missing', permanent: false } };
    }


    return { props: { user, ...data } }; // electionState from data will have eventId
  } catch (e) {
    console.error("Error in voting-stand getServerSideProps:", e);
    return { redirect: { destination: '/login', permanent: false } };
  }
};

export default Page;
