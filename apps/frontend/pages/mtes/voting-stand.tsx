import { useState, useMemo } from 'react';
import { enqueueSnackbar } from 'notistack';
import { useRouter } from 'next/router';
import { GetServerSideProps, NextPage } from 'next';
import { WithId } from 'mongodb';
import { TabContext, TabPanel } from '@mui/lab';
import { Paper, Tabs, Tab, Typography, Box, Card, CardContent } from '@mui/material';
import { ElectionState, DivisionWithEvent, Member, SafeUser, Role, Round } from '@mtes/types';
import Layout from '../../components/layout';
import { RoleAuthorizer } from '../../components/role-authorizer';
// import { useWebsocket } from '../../hooks/use-websocket';
import { localizedRoles } from '../../localization/roles';
import { apiFetch, getUserAndDivision, serverSideGetRequests } from '../../lib/utils/fetch';
import { useQueryParam } from '../../hooks/use-query-param';
import { Formik, Form, Field, FieldProps } from 'formik';
import { Button, FormControl, FormLabel, RadioGroup, Radio, FormControlLabel } from '@mui/material';
import { useWebsocket } from 'apps/frontend/hooks/use-websocket';

interface Props {
  user: WithId<SafeUser>;
  electionState: WithId<ElectionState>;
}

const Page: NextPage<Props> = ({ user, electionState }) => {
  const router = useRouter();
  const [votingConf, setVotingConf] = useState<Round | null>(electionState.activeRound || null);
  const [member, setMember] = useState<Member | null>(null);

  function handleUpdateMember(member: Member) {
    setMember(member);
  }

  const { socket, connectionStatus } = useWebsocket([
    {
      name: 'votingMemberLoaded',
      handler: handleUpdateMember
    },
    {
      name: 'roundLoaded',
      handler: (round: Round) => {
        setVotingConf(round);
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
      <Layout title={`ממשק ${user.role}`} connectionStatus={connectionStatus}>
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
            <Typography variant="h4" fontWeight="bold">מערכת הצבעה</Typography>
          </Paper>

          <Paper elevation={2} sx={{ mt: 3, p: 4 }}>
            {votingConf ? (
              <>
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  mb: 4,
                  pb: 3,
                  borderBottom: '1px solid rgba(0,0,0,0.1)'
                }}>
                  <Typography color="primary" gutterBottom>סבב נוכחי</Typography>
                  <Typography variant="h4" fontWeight="bold">{votingConf.name}</Typography>
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
                        <Box sx={{ 
                          width: 60, 
                          height: 60, 
                          borderRadius: '50%', 
                          bgcolor: 'primary.main',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px'
                        }}>
                          {member.name.charAt(0)}
                        </Box>
                        <Box>
                          <Typography variant="h5" fontWeight="bold">{member.name}</Typography>
                          <Typography color="text.secondary">{member.city}</Typography>
                        </Box>
                      </Box>
                    </Paper>

                    <Formik
                      initialValues={Object.fromEntries(
                        votingConf.roles.flatMap(role =>
                          role.contestants.map(c => [`${role.role}-${c.name}`, 0])
                        )
                      )}
                      validate={values => {
                        const errors: Record<string, string> = {};
                        votingConf.roles.forEach(roleConfig => {
                          const selectedVotes = Object.entries(values).filter(
                            ([key, value]) => key.startsWith(roleConfig.role) && value === 1
                          ).length;
                          if (selectedVotes !== roleConfig.maxVotes) {
                            // Add a general error or an error specific to the role section
                            errors[
                              roleConfig.role
                            ] = `יש לבחור ${roleConfig.maxVotes} מתמודדים לתפקיד ${roleConfig.role}`;
                          }
                        });
                        return errors;
                      }}
                      onSubmit={(values, { setSubmitting }) => {
                        console.log('Submitting valid votes:', values);

                        apiFetch('/api/events/vote', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            memberId: member,
                            votes: Object.entries(values).map(([key, value]) => ({
                              role: key.split('-')[0],
                              contestant: key.split('-')[1],
                              vote: value
                            }))
                          })
                        }).then(response => {
                          if (!response.ok) {
                            throw new Error('Network response was not ok');
                          }
                        });

                        // Example: socket?.emit('submitVotes', { memberId: member.id, votes: values });
                        enqueueSnackbar('ההצבעה נשלחה בהצלחה!', { variant: 'success' });
                        // Optionally reset form or navigate away
                        setSubmitting(false);
                        // Reset member state to wait for next voter
                        setMember(null);
                      }}
                    >
                      {({
                        handleSubmit,
                        setFieldValue,
                        values,
                        errors,
                        touched,
                        isValid,
                        dirty
                      }) => (
                        <Form onSubmit={handleSubmit}>
                          {votingConf.roles.map(roleConfig => {
                            const selectedVotes = Object.entries(values).filter(
                              ([key, value]) => key.startsWith(roleConfig.role) && value === 1
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
                                    <Typography variant="body2" color={selectedVotes === roleConfig.maxVotes ? 'success.main' : 'info.main'}>
                                      {selectedVotes} / {roleConfig.maxVotes} נבחרו
                                    </Typography>
                                  </Box>
                                </Box>

                                <Box sx={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                  gap: 2,
                                  justifyItems: 'center'
                                }}>
                                  {roleConfig.contestants.map(contestant => {
                                    const fieldName = `${roleConfig.role}-${contestant.name}`;
                                    const isSelected = values[fieldName] === 1;
                                    const isDisabled = !isSelected && selectedVotes >= roleConfig.maxVotes;

                                    return (
                                      <Card
                                        key={contestant.name}
                                        sx={{
                                          width: '100%',
                                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                                          transition: 'all 0.2s ease',
                                          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                          border: isSelected ? '2px solid #2196F3' : '1px solid rgba(0,0,0,0.12)',
                                          opacity: isDisabled ? 0.6 : 1,
                                          '&:hover': {
                                            boxShadow: isDisabled ? 1 : 4
                                          }
                                        }}
                                        onClick={() => {
                                          if (!isDisabled || isSelected) {
                                            setFieldValue(fieldName, isSelected ? 0 : 1, true);
                                          }
                                        }}
                                      >
                                        <CardContent sx={{ textAlign: 'center', p: 3 }}>
                                          <Typography variant="h6" gutterBottom>{contestant.name}</Typography>
                                          <Typography variant="body2" color="text.secondary">
                                            {contestant.city}
                                          </Typography>
                                        </CardContent>
                                      </Card>
                                    );
                                  })}
                                </Box>
                                
                                {errors[roleConfig.role] && (
                                  <Typography color="error" sx={{ mt: 2, textAlign: 'center' }}>
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
                              disabled={!isValid || !dirty}
                              sx={{
                                px: 6,
                                py: 2,
                                borderRadius: 2,
                                fontSize: '1.1rem'
                              }}
                            >
                              אישור הצבעה
                            </Button>
                          </Box>
                        </Form>
                      )}
                    </Formik>
                  </>
                ) : (
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 8,
                    background: 'rgba(0,0,0,0.02)',
                    borderRadius: 2
                  }}>
                    <Typography variant="h5" color="text.secondary">מחכה למצביע....</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      נא להמתין עד שיזוהה המצביע הבא
                    </Typography>
                  </Box>
                )}
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h5" color="error">אין תצורת הצבעה זמינה</Typography>
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
