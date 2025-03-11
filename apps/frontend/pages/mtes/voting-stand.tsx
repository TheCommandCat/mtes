import { useState, useMemo } from 'react';
import { enqueueSnackbar } from 'notistack';
import { useRouter } from 'next/router';
import { GetServerSideProps, NextPage } from 'next';
import { WithId } from 'mongodb';
import { TabContext, TabPanel } from '@mui/lab';
import { Paper, Tabs, Tab, Typography, Box, Card, CardContent } from '@mui/material';
import {
  DivisionState,
  DivisionWithEvent,
  Member,
  RoleConfig,
  SafeUser,
  VotingConfig
} from '@mtes/types';
import Layout from '../../components/layout';
import { RoleAuthorizer } from '../../components/role-authorizer';
// import { useWebsocket } from '../../hooks/use-websocket';
import { localizedRoles } from '../../localization/roles';
import { getUserAndDivision, serverSideGetRequests } from '../../lib/utils/fetch';
import { useQueryParam } from '../../hooks/use-query-param';
import { Formik, Form, Field, FieldProps } from 'formik';
import { Button, FormControl, FormLabel, RadioGroup, Radio, FormControlLabel } from '@mui/material';

interface Props {
  user: WithId<SafeUser>;
  division: WithId<DivisionWithEvent>;
  divisionState: WithId<DivisionState>;
}

const Page: NextPage<Props> = ({
  user,
  division: initialDivision,
  divisionState: initialDivisionState
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useQueryParam('tab', '1');
  const [division] = useState<WithId<DivisionWithEvent>>(initialDivision);
  const [divisionState, setDivisionState] = useState<WithId<DivisionState>>(initialDivisionState);
  const [votingConf, setVotingConf] = useState<VotingConfig | undefined>(undefined);
  const [member, setMember] = useState<Member | null>(null);

  const Votingcnf: VotingConfig = {
    roles: [
      {
        role: 'יו"ר',
        contestants: [
          {
            name: 'Contestant 1',
            city: 'תל אביב יפו'
          },
          {
            name: 'Contestant 2',
            city: 'תל אביב יפו'
          }
        ],
        maxVotes: 1
      },
      {
        role: 'סיו"ר',
        contestants: [
          {
            name: 'Contestant 3',
            city: 'תל אביב יפו'
          },
          {
            name: 'Contestant 4',
            city: 'תל אביב יפו'
          }
        ],
        maxVotes: 2
      }
    ]
  };

  const memberCnf: Member = {
    name: 'ניר חן',
    city: 'תל אביב יפו'
  };
  // handel statments

  // socket
  //   const { socket, connectionStatus } = useWebsocket(
  //     division._id.toString(),
  //     ['pit-admin', 'field', 'judging'],
  //     undefined,
  //     [
  //     //   { name: 'name', handler: handler },

  //     ]
  //   );

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
        title={`ממשק ${user.role}`}
        // connectionStatus={connectionStatus}
        color={division.color}
      >
        <Box sx={{ mt: 2 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h1">Voting Stand UI</Typography>
          </Paper>
          <Paper sx={{ mt: 2, p: 5, textAlign: 'center' }}>
            {member ? (
              <>
                <Typography>
                  המצביע
                  <br />
                  --------------------------------------
                </Typography>

                <Typography variant="h5">{member.name}</Typography>
                <Typography variant="subtitle1">{member.city}</Typography>
              </>
            ) : (
              <>
                <Typography variant="h2">No member selected</Typography>
                <Button variant="contained" onClick={() => setMember(memberCnf)}>
                  Load Member
                </Button>
              </>
            )}
            {votingConf ? (
              <Formik
                initialValues={Object.fromEntries(
                  votingConf.roles.flatMap(role =>
                    role.contestants.map(c => [`${role.role}-${c.name}`, 0])
                  )
                )}
                onSubmit={values => {
                  console.log(values);
                  // Handle submission here
                }}
              >
                {({ handleSubmit, setFieldValue, values }) => (
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
                              justifyContent: 'center'
                            }}
                          >
                            {roleConfig.contestants.map(contestant => {
                              const [selected, setSelected] = useState(false);
                              const isDisabled = !selected && selectedVotes >= roleConfig.maxVotes;

                              return (
                                <>
                                  <Card
                                    key={contestant.name}
                                    variant="outlined"
                                    sx={{
                                      m: 2,
                                      boxShadow: selected ? '0 0 20px blue' : '0 0 5px black',
                                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                                      width: '10rem',
                                      userSelect: 'none'
                                    }}
                                    onClick={() => {
                                      if (!isDisabled) {
                                        console.log(
                                          'clicked',
                                          roleConfig.role + ' ' + contestant.name
                                        );

                                        setSelected(!selected);
                                        console.log(selected);
                                        // Update Formik values
                                        setFieldValue(
                                          `${roleConfig.role}-${contestant.name}`,
                                          selected ? 0 : 1
                                        );
                                      }
                                    }}
                                  >
                                    <CardContent>
                                      <Typography variant="h4">{contestant.name}</Typography>
                                      <Typography variant="subtitle2">{contestant.city}</Typography>
                                    </CardContent>
                                  </Card>
                                </>
                              );
                            })}
                          </FormControl>
                        </Box>
                      );
                    })}
                    <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
                      Submit Votes
                    </Button>
                  </Form>
                )}
              </Formik>
            ) : (
              <>
                <Typography>No voting configuration available</Typography>
                <Button variant="contained" onClick={() => setVotingConf(Votingcnf)}>
                  Load Voting Configuration
                </Button>
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
        division: `/api/divisions?withEvent=true`,
        divisionState: `/api/divisions/state`,
        teams: `/api/divisions/teams`,
        tickets: `/api/divisions/tickets`,
        rooms: `/api/divisions/rooms`,
        tables: `/api/divisions/tables`,
        matches: `/api/divisions/matches`,
        sessions: `/api/divisions/sessions`,
        cvForms: `/api/divisions/cv-forms`
      },
      ctx
    );

    return { props: { user, ...data } };
  } catch {
    return { redirect: { destination: '/login', permanent: false } };
  }
};

export default Page;
