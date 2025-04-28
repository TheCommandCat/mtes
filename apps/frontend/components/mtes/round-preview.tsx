import { Box, Typography, Paper, Chip, Avatar } from '@mui/material';
import { WithId } from 'mongodb';
import { Member, Round } from '@mtes/types';

interface RoundPreviewProps {
  round: WithId<Round>;
  members: WithId<Member>[];
}

export const RoundPreview = ({ round, members }: RoundPreviewProps) => {
  return (
    <>
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

      <Box sx={{ mb: 4 }}>
        {round.roles.map(role => (
          <Paper
            key={role.role.toString()}
            elevation={1}
            sx={{ p: 3, mb: 2, bgcolor: 'background.default' }}
          >
            <Typography variant="h6" color="primary" gutterBottom>
              {role.role}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              מקסימום הצבעות: {role.maxVotes}
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {role.contestants.map(contestant => (
                <Chip
                  key={contestant.name}
                  label={`${contestant.name} - ${contestant.city}`}
                  variant="outlined"
                />
              ))}
            </Box>
          </Paper>
        ))}
      </Box>
    </>
  );
};
