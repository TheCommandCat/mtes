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
  electionState: WithId<ElectionState>;
}

const Page: NextPage<Props> = ({ user, electionState }) => {
  const router = useRouter();
  const [round, setRound] = useState<WithId<Round> | null>(electionState.activeRound || null);
  const [member, setMember] = useState<WithId<Member> | null>(null);
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

  const { socket, connectionStatus } = useWebsocket([
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
                      round={round}
                      member={member}
                      votingStandId={votingStandId}
                      socket={socket}
                      onVoteComplete={handleVoteComplete}
                    />
                  </>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: '400px'
                    }}
                  >
                    <WaitingState title="מחכה למצביע...." subtitle="נא להמתין עד שיזוהה המצביע הבא" />
                  </Box>
                )}
              </>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '200px'
                }}
              >
                <WaitingState title="אין תצורת הצבעה זמינה" subtitle="אנא פנה למנהל המערכת" error />
              </Box>
            )}
          </Paper>
        </Box>
      </Layout>
    </RoleAuthorizer>
  );
};

export const getServerSideProps: GetServerSideProps = async ctx => {
  try {
    const { user } = await getUserAndDivision(ctx);

    const data = await serverSideGetRequests(
      {
        electionState: '/api/events/state'
      },
      ctx
    );

    return { props: { user, ...data } };
  } catch {
    return { redirect: { destination: '/login', permanent: false } };
  }
};

export default Page;
