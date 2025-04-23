import { useState, useMemo, useEffect } from 'react';
import { enqueueSnackbar } from 'notistack';
import { useRouter } from 'next/router';
import { GetServerSideProps, NextPage } from 'next';
import { WithId } from 'mongodb';
import { Paper, Typography, Box, Card, CardContent, Button } from '@mui/material';
import { ElectionState, Member, SafeUser, Round, Positions } from '@mtes/types';
import Layout from '../../components/layout';
import { RoleAuthorizer } from '../../components/role-authorizer';
import { apiFetch, getUserAndDivision, serverSideGetRequests } from '../../lib/utils/fetch';
import { Formik, Form } from 'formik';
import { useWebsocket } from 'apps/frontend/hooks/use-websocket';

interface Props {
  user: WithId<SafeUser>;
  electionState: WithId<ElectionState>;
}

const Page: NextPage<Props> = ({ user, electionState }) => {
  const router = useRouter();
  const [round, setRound] = useState<WithId<Round> | null>(electionState.activeRound || null);
  const [member, setMember] = useState<WithId<Member> | null>(null);
  const [isRoundLocked, setIsRoundLocked] = useState(false);
  const votingStandId = user.roleAssociation?.value;

  function handleUpdateMember(memberData: Member, votingStand: number) {
    if (votingStandId === votingStand) {
      setMember(memberData as WithId<Member>);
    }
  }

  // Check round lock status whenever round changes
  useEffect(() => {
    if (round) {
      const checkRoundStatus = async () => {
        try {
          const res = await apiFetch(`/api/events/roundStatus/${round._id}`, {
            method: 'GET'
          });
          if (res.ok) {
            const data = await res.json();
            setIsRoundLocked(data.isLocked);
          }
        } catch (error) {
          console.error('Error checking round status:', error);
        }
      };
      checkRoundStatus();
    }
  }, [round]);

  const { socket, connectionStatus } = useWebsocket([
    {
      name: 'votingMemberLoaded',
      handler: handleUpdateMember
    },
    {
      name: 'roundLoaded',
      handler: (newRound: WithId<Round>) => {
        setRound(newRound);
        setMember(null); // Reset member when a new round starts
        setIsRoundLocked(false);
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
        title={`ממשק ${user.role} - עמדה ${user.roleAssociation?.value}`}
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
                {isRoundLocked ? (
                  <Box
                    sx={{
                      textAlign: 'center',
                      py: 8,
                      background: 'rgba(0,0,0,0.02)',
                      borderRadius: 2
                    }}
                  >
                    <Typography variant="h5" color="warning.main">
                      סבב נעול
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                      הסבב ננעל ולא ניתן להצביע יותר
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        mb: 4,
                        pb: 3,
                        borderBottom: '1px solid rgba(0,0,0,0.1)'
                      }}
                    >
                      <Typography color="primary" gutterBottom>
                        סבב נוכחי
                      </Typography>
                      <Typography variant="h4" fontWeight="bold">
                        {round.name}
                      </Typography>
                    </Box>

                    {member ? (
                      <>
                        <Paper
                          elevation={1}
                          sx={{
                            p: 3,
                            mb: 4,
                            background: 'rgba(33, 150, 243, 0.05)',
                            border: '1px solid rgba(33, 150, 243, 0.2)',
                            borderRadius: 2
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                              sx={{
                                width: 60,
                                height: 60,
                                borderRadius: '50%',
                                bgcolor: 'primary.main',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '24px'
                              }}
                            >
                              {member.name.charAt(0)}
                            </Box>
                            <Box>
                              <Typography variant="h5" fontWeight="bold">
                                {member.name}
                              </Typography>
                              <Typography color="text.secondary">{member.city}</Typography>
                            </Box>
                          </Box>
                        </Paper>

                        <Formik
                          // Initial values: { "role1-contestantId": 0, "role1-contestantId2": 0, ... }
                          initialValues={Object.fromEntries(
                            round.roles.flatMap(role =>
                              role.contestants.map(c => [
                                `${role.role}-${c._id}`,
                                0 // 0 = not selected, 1 = selected
                              ])
                            )
                          )}
                          validate={values => {
                            const errors: Record<string, string> = {};
                            round.roles.forEach(roleConfig => {
                              const selectedCount = Object.entries(values).filter(
                                ([key, value]) =>
                                  key.startsWith(roleConfig.role + '-') && value === 1
                              ).length;

                              if (selectedCount !== roleConfig.maxVotes) {
                                errors[
                                  roleConfig.role
                                ] = `יש לבחור ${roleConfig.maxVotes} מתמודדים לתפקיד ${roleConfig.role}`;
                              }
                            });
                            return errors;
                          }}
                          onSubmit={(values, { setSubmitting, resetForm }) => {
                            const formattedVotes: Record<Positions | string, string[]> = {};
                            round.roles.forEach(roleConfig => {
                              formattedVotes[roleConfig.role] = Object.entries(values)
                                .filter(
                                  ([key, value]) =>
                                    key.startsWith(roleConfig.role + '-') && value === 1
                                )
                                .map(([key]) => key.split('-')[1]); // Extract contestant ID
                            });

                            const payload = {
                              roundId: round._id,
                              memberId: member._id,
                              votes: formattedVotes,
                              votingStandId
                            };

                            console.log('Submitting payload:', JSON.stringify(payload, null, 2));

                            socket.emit(
                              'voteSubmitted',
                              member,
                              votingStandId,
                              (processResponse: { ok: boolean; error?: string }) => {
                                if (processResponse.ok) {
                                  console.log('Vote submitted successfully');
                                } else {
                                  console.log('Vote submission failed:', processResponse.error);
                                }
                              }
                            );

                            apiFetch('/api/events/vote', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(payload)
                            })
                              .then(response => {
                                if (!response.ok) {
                                  return response.text().then(text => {
                                    throw new Error(text || 'Network response was not ok');
                                  });
                                }
                                return response.json(); // Or response.text()
                              })
                              .then(data => {
                                console.log('Vote successful:', data);
                                enqueueSnackbar('ההצבעה נשלחה בהצלחה!', {
                                  variant: 'success'
                                });
                                socket.emit(
                                  'voteProcessed',
                                  member,
                                  votingStandId,
                                  (processResponse: { ok: boolean; error?: string }) => {
                                    if (processResponse.ok) {
                                      console.log('Vote processed successfully');
                                    } else {
                                      console.log('Vote processing failed:', processResponse.error);
                                    }
                                  }
                                );
                                setMember(null); // Reset member for next voter
                                resetForm(); // Reset form fields
                              })
                              .catch(error => {
                                console.error('Vote submission failed:', error);
                                enqueueSnackbar(`שגיאה בשליחת ההצבעה: ${error.message}`, {
                                  variant: 'error'
                                });
                              })
                              .finally(() => {
                                setSubmitting(false);
                              });
                          }}
                        >
                          {({
                            handleSubmit,
                            setFieldValue,
                            values,
                            errors,
                            touched,
                            isValid,
                            dirty,
                            isSubmitting
                          }) => (
                            <Form onSubmit={handleSubmit}>
                              {round.roles.map(roleConfig => {
                                // Calculate current selections for this role
                                const selectedCount = Object.entries(values).filter(
                                  ([key, value]) =>
                                    key.startsWith(roleConfig.role + '-') && value === 1
                                ).length;

                                return (
                                  <Box key={roleConfig.role} sx={{ mb: 6 }}>
                                    <Box sx={{ mb: 3, textAlign: 'center' }}>
                                      <Typography variant="h5" fontWeight="bold" color="primary">
                                        {roleConfig.role}
                                      </Typography>
                                      <Typography variant="body1" color="text.secondary">
                                        {roleConfig.maxVotes === 1
                                          ? 'בחר מתמודד אחד'
                                          : `בחר ${roleConfig.maxVotes} מתמודדים`}
                                      </Typography>
                                      <Box sx={{ mt: 1 }}>
                                        <Typography
                                          variant="body2"
                                          color={
                                            selectedCount === roleConfig.maxVotes
                                              ? 'success.main'
                                              : 'info.main'
                                          }
                                        >
                                          {selectedCount} / {roleConfig.maxVotes} נבחרו
                                        </Typography>
                                      </Box>
                                    </Box>

                                    <Box
                                      sx={{
                                        display: 'grid',
                                        gridTemplateColumns:
                                          'repeat(auto-fill, minmax(200px, 1fr))',
                                        gap: 2,
                                        justifyItems: 'center'
                                      }}
                                    >
                                      {roleConfig.contestants.map(contestant => {
                                        const fieldName = `${roleConfig.role}-${contestant._id}`;
                                        const isSelected = values[fieldName] === 1;
                                        // Disable clicking if max votes reached and this one isn't selected
                                        const isDisabled =
                                          !isSelected && selectedCount >= roleConfig.maxVotes;

                                        return (
                                          <Card
                                            key={contestant.name}
                                            variant="outlined"
                                            sx={{
                                              width: '100%',
                                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                                              transition: 'all 0.2s ease',
                                              transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                              border: isSelected
                                                ? '2px solid #2196F3'
                                                : '1px solid rgba(0,0,0,0.12)',
                                              opacity: isDisabled ? 0.6 : 1,
                                              userSelect: 'none',
                                              '&:hover': {
                                                boxShadow: isDisabled ? 1 : 4
                                              }
                                            }}
                                            onClick={() => {
                                              if (isSelected) {
                                                // Always allow deselection
                                                setFieldValue(fieldName, 0, true);
                                              } else if (!isDisabled) {
                                                // Allow selection only if not disabled
                                                setFieldValue(fieldName, 1, true);
                                              }
                                              // Optional: Add feedback if trying to select when disabled
                                              // else {
                                              //   enqueueSnackbar(`ניתן לבחור עד ${roleConfig.maxVotes} מתמודדים לתפקיד זה`, { variant: 'warning' });
                                              // }
                                            }}
                                          >
                                            <CardContent sx={{ textAlign: 'center', p: 3 }}>
                                              <Typography variant="h6" gutterBottom>
                                                {contestant.name}
                                              </Typography>
                                              <Typography variant="body2" color="text.secondary">
                                                {contestant.city}
                                              </Typography>
                                            </CardContent>
                                          </Card>
                                        );
                                      })}
                                    </Box>

                                    {errors[roleConfig.role] &&
                                      touched[
                                        `${roleConfig.role}-${roleConfig.contestants[0]?._id}`
                                      ] && ( // Show error if touched any field related to the role
                                        <Typography
                                          color="error"
                                          sx={{ mt: 2, textAlign: 'center' }}
                                        >
                                          {errors[roleConfig.role]}
                                        </Typography>
                                      )}
                                  </Box>
                                );
                              })}

                              <Box sx={{ textAlign: 'center', mt: 4 }}>
                                <Button
                                  type="submit"
                                  variant="contained"
                                  size="large"
                                  disabled={!isValid || !dirty || isSubmitting}
                                  sx={{
                                    px: 6,
                                    py: 2,
                                    borderRadius: 2,
                                    fontSize: '1.1rem'
                                  }}
                                >
                                  {isSubmitting ? 'שולח...' : 'אישור הצבעה'}
                                </Button>
                              </Box>
                            </Form>
                          )}
                        </Formik>
                      </>
                    ) : (
                      <Box
                        sx={{
                          textAlign: 'center',
                          py: 8,
                          background: 'rgba(0,0,0,0.02)',
                          borderRadius: 2
                        }}
                      >
                        <Typography variant="h5" color="text.secondary">
                          מחכה למצביע....
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          נא להמתין עד שיזוהה המצביע הבא
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h5" color="error">
                  אין תצורת הצבעה זמינה
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  אנא פנה למנהל המערכת
                </Typography>
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
