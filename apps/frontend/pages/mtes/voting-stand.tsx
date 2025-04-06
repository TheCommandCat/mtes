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
        <Box sx={{ mt: 2 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h1">Voting Stand UI</Typography>
          </Paper>
          <Paper sx={{ mt: 2, p: 5, textAlign: 'center' }}>
            {votingConf ? (
              <>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 4
                  }}
                >
                  <Typography>סבב</Typography>
                  <Typography variant="h2">{votingConf.name}</Typography>
                </Box>
                {member ? (
                  <>
                    <Typography>
                      המצביע
                      <br />
                      --------------------------------------
                    </Typography>

                    <Typography variant="h5">{member.name}</Typography>
                    <Typography variant="subtitle1">{member.city}</Typography>

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
                              <Box
                                key={roleConfig.role}
                                sx={{
                                  mt: 4,
                                  mb: 4
                                }}
                              >
                                <Typography variant="h1">{roleConfig.role}</Typography>
                                <Typography variant="subtitle1">
                                  {roleConfig.maxVotes === 1
                                    ? 'בחר מתמודד אחד'
                                    : `בחר ${roleConfig.maxVotes} מתמודדים`}
                                </Typography>
                                <FormControl
                                  component="fieldset"
                                  sx={{
                                    mt: 2,
                                    display: 'flex',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    flexWrap: 'wrap' // Allow cards to wrap if needed
                                  }}
                                >
                                  {roleConfig.contestants.map(contestant => {
                                    const fieldName = `${roleConfig.role}-${contestant.name}`;
                                    const isSelected = values[fieldName] === 1;
                                    // Disable if max votes reached AND this card isn't already selected
                                    const isDisabled =
                                      !isSelected && selectedVotes >= roleConfig.maxVotes;

                                    return (
                                      <Card
                                        key={contestant.name}
                                        variant="outlined"
                                        sx={{
                                          m: 1, // Adjust margin for better spacing
                                          boxShadow: isSelected ? '0 0 15px blue' : '0 0 3px grey', // Clearer selection indication
                                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                                          width: '10rem',
                                          userSelect: 'none',
                                          opacity: isDisabled ? 0.6 : 1 // Visual cue for disabled
                                        }}
                                        onClick={() => {
                                          // Allow clicking to select if not disabled, or to deselect if already selected
                                          if (!isDisabled || isSelected) {
                                            const newValue = isSelected ? 0 : 1;
                                            // Set field value and mark as touched to trigger validation check
                                            setFieldValue(fieldName, newValue, true);
                                          }
                                        }}
                                      >
                                        <CardContent>
                                          <Typography variant="h4">{contestant.name}</Typography>
                                          <Typography variant="subtitle2">
                                            {contestant.city}
                                          </Typography>
                                        </CardContent>
                                      </Card>
                                    );
                                  })}
                                </FormControl>
                                {errors[roleConfig.role] && (
                                  <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                                    {errors[roleConfig.role]}
                                  </Typography>
                                )}
                              </Box>
                            );
                          })}
                          <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            size="large"
                            sx={{ mt: 4, py: 1.5, px: 4 }}
                            disabled={!isValid || !dirty}
                          >
                            אישור הצבעה
                          </Button>
                        </Form>
                      )}
                    </Formik>
                  </>
                ) : (
                  <>
                    <Typography variant="h2">מחכה למצביע....</Typography>
                  </>
                )}
              </>
            ) : (
              <>
                <Typography>No voting configuration available</Typography>
              </>
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
