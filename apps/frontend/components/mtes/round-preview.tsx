import {
  Box,
  Typography,
  Paper,
  Chip,
  Avatar,
  useTheme,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import PersonOutline from '@mui/icons-material/PersonOutline';
import LocationCity from '@mui/icons-material/LocationCity';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import HighlightOff from '@mui/icons-material/HighlightOff';
import HowToVoteOutlined from '@mui/icons-material/HowToVoteOutlined';
import { WithId } from 'mongodb';
import { Member, Round } from '@mtes/types';

interface RoundPreviewProps {
  round: WithId<Round>;
  members: WithId<Member>[];
}

export const RoundPreview = ({ round, members }: RoundPreviewProps) => {
  const theme = useTheme();
  const memberPresenceMap = new Map(members.map(m => [m._id.toString(), m.isPresent]));

  return (
    <>
      <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {round.roles.map(role => (
          <Paper
            key={role.role.toString()}
            elevation={3}
            sx={{
              p: 3,
              mb: 3,
              bgcolor: 'background.paper',
              borderLeft: `5px solid ${theme.palette.primary.main}`,
              width: '100%', // Ensure paper takes full width for centering content
              maxWidth: '800px', // Max width for better readability
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center' // Center content within the paper
            }}
          >
            <Typography
              variant="h4" // Made role name even bigger
              component="div"
              color="primary.main"
              sx={{ fontWeight: 'bold', mb: 1, textAlign: 'center' }}
            >
              {role.role}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
              <HowToVoteOutlined sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="h6" color="text.secondary">
                {' '}
                {/* Made max votes slightly larger */}
                מקסימום הצבעות: {role.maxVotes}
              </Typography>
            </Box>

            <Grid container spacing={3} justifyContent="center" sx={{ width: '100%' }}>
              {role.contestants.map(contestant => {
                const isPresent = memberPresenceMap.get(contestant._id.toString()) || false;
                return (
                  <Grid item key={contestant._id.toString()} xs={12} sm={6} md={5} lg={4}>
                    <Card
                      variant="outlined"
                      sx={{
                        textAlign: 'center',
                        p: 2,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        boxShadow: theme.shadows[2]
                      }}
                    >
                      <CardContent>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 1.5
                          }}
                        >
                          <PersonOutline
                            sx={{ mr: 1, color: theme.palette.primary.main }}
                            fontSize="large"
                          />
                          <Typography variant="h6" component="div" sx={{ fontWeight: 'medium' }}>
                            {contestant.name}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 1.5
                          }}
                        >
                          <LocationCity sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body1" color="text.secondary">
                            {contestant.city}
                          </Typography>
                        </Box>
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          {isPresent ? (
                            <CheckCircleOutline color="success" sx={{ mr: 1 }} />
                          ) : (
                            <HighlightOff color="error" sx={{ mr: 1 }} />
                          )}
                          <Typography
                            variant="body1"
                            color={isPresent ? 'success.main' : 'error.main'}
                            sx={{ fontWeight: 'medium' }}
                          >
                            {isPresent ? 'נוכח.ת' : 'לא נוכח.ת'}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        ))}
      </Box>
      <Paper elevation={1} sx={{ p: 3, mb: 4, bgcolor: 'background.default' }}>
        <Typography variant="h6" color="primary" gutterBottom>
          מצביעים מורשים
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 2,
            mt: 2
          }}
        >
          {members.map(member => (
            <Chip
              key={member._id.toString()}
              avatar={<Avatar>{member.name.charAt(0)}</Avatar>}
              label={`${member.name} - ${member.city}`}
              variant="outlined"
              sx={{
                height: 'auto',
                '& .MuiChip-label': {
                  whiteSpace: 'normal',
                  py: 1
                }
              }}
            />
          ))}
        </Box>
      </Paper>
    </>
  );
};
