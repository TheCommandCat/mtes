import {
  Box,
  Grid,
  Typography,
  Paper,
  Chip,
  Divider,
  Card,
  CardContent,
  Avatar
} from '@mui/material';
import { WithId } from 'mongodb';
import { Cities, Member, VotingStandStatus, VotingStates, VotingStatus, Round } from '@mtes/types';
import { MembersColumn } from '../members-column';
import { ReadOnlyVotingStandsGrid } from '../readonly-voting-stands-grid';
import { DndContext, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { MembersGrid } from '../members-grid';
import { CityGroupedMembersGrid } from '../city-grouped-members-grid';
import PersonIcon from '@mui/icons-material/Person';
import HowToVoteIcon from '@mui/icons-material/HowToVote';

interface AudienceVotingDisplayProps {
  members: WithId<Member>[];
  votedMembers: WithId<VotingStatus>[];
  standStatuses: Record<number, VotingStandStatus>;
  activeRound?: WithId<Round> | null;
}

export const AudienceVotingDisplay = ({
  members,
  votedMembers,
  standStatuses,
  activeRound
}: AudienceVotingDisplayProps) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <Box
        sx={{
          width: '100vw',
          height: '100vh',
          maxWidth: '1920px',
          maxHeight: '1080px',
          overflow: 'hidden',
          p: 2,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Main Header */}
        <Paper
          elevation={6}
          sx={{
            p: 2,
            mb: 2,
            background: 'linear-gradient(145deg, #1976d2 0%, #1565c0 100%)',
            borderRadius: 3,
            color: 'white',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(25, 118, 210, 0.3)',
            flexShrink: 0
          }}
        >
          <Typography
            variant="h3"
            sx={{
              fontWeight: 'bold',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
              lineHeight: 1.2
            }}
          >
            מעקב הצבעה
            {activeRound && (
              <Typography
                component="span"
                variant="h4"
                sx={{
                  fontWeight: 'medium',
                  opacity: 0.9,
                  display: 'block',
                  mt: 0.5
                }}
              >
                {activeRound.name}
              </Typography>
            )}
          </Typography>
        </Paper>

        {/* Content Area */}
        <Box sx={{ flex: 1, display: 'flex', gap: 2, overflow: 'hidden' }}>
          {/* Left Column - Round Information */}
          {activeRound && (
            <Box sx={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* Round Information */}
              <Paper
                elevation={4}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  flex: 1,
                  overflow: 'hidden'
                }}
              >
                <Typography
                  variant="h5"
                  component="h2"
                  color="primary"
                  sx={{
                    textAlign: 'center',
                    mb: 2,
                    fontWeight: 'bold'
                  }}
                >
                  תפקידים ומתמודדים
                </Typography>

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    maxHeight: 'calc(100% - 60px)',
                    overflow: 'auto',
                    pr: 1
                  }}
                >
                  {activeRound.roles.map((roleConfig, index) => (
                    <Card
                      key={index}
                      elevation={2}
                      sx={{
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'primary.200'
                      }}
                    >
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <HowToVoteIcon color="primary" sx={{ mr: 1, fontSize: '1.2rem' }} />
                          <Typography
                            variant="h6"
                            component="h3"
                            color="primary"
                            sx={{ fontWeight: 'bold', fontSize: '1rem' }}
                          >
                            {roleConfig.role}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {roleConfig.contestants.map((contestant, idx) => (
                            <Chip
                              key={contestant._id.toString()}
                              label={contestant.name}
                              size="small"
                              sx={{
                                backgroundColor: contestant.name.includes('פתק לבן')
                                  ? 'grey.200'
                                  : 'primary.100',
                                color: contestant.name.includes('פתק לבן')
                                  ? 'text.secondary'
                                  : 'primary.dark',
                                fontSize: '0.75rem',
                                height: '24px'
                              }}
                            />
                          ))}
                        </Box>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}
                        >
                          מקסימום קולות: {roleConfig.maxVotes}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Paper>

              {/* Voting Stands */}
              <Paper
                elevation={4}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                  flex: '0 0 auto'
                }}
              >
                <Typography
                  variant="h6"
                  textAlign="center"
                  color="primary"
                  sx={{
                    mb: 1,
                    fontWeight: 'bold'
                  }}
                >
                  עמדות הצבעה
                </Typography>
                <ReadOnlyVotingStandsGrid standStatuses={standStatuses} />
              </Paper>
            </Box>
          )}

          {/* Right Column - Members Grid */}
          <Box
            sx={{
              flex: activeRound ? '0 0 60%' : '1',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5
            }}
          >
            {!activeRound && (
              <Paper
                elevation={4}
                sx={{
                  p: 2,
                  mb: 1.5,
                  borderRadius: 2,
                  background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)'
                }}
              >
                <Typography
                  variant="h6"
                  textAlign="center"
                  color="primary"
                  sx={{
                    mb: 1,
                    fontWeight: 'bold'
                  }}
                >
                  עמדות הצבעה
                </Typography>
                <ReadOnlyVotingStandsGrid standStatuses={standStatuses} />
              </Paper>
            )}

            <Grid container spacing={1.5} sx={{ flex: 1, height: 0 }}>
              <Grid item xs={6} sx={{ height: '100%' }}>
                <Paper
                  elevation={4}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <CityGroupedMembersGrid
                    members={members}
                    votedMembers={votedMembers}
                    standStatuses={standStatuses}
                    filterType="waitingToVote"
                    title="ממתינים להצבעה"
                    titleColor="primary.main"
                  />
                </Paper>
              </Grid>
              <Grid item xs={6} sx={{ height: '100%' }}>
                <Paper
                  elevation={4}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <CityGroupedMembersGrid
                    members={members}
                    votedMembers={votedMembers}
                    standStatuses={standStatuses}
                    filterType="voted"
                    title="הצביעו"
                    titleColor="success.main"
                  />
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Box>
    </DndProvider>
  );
};
