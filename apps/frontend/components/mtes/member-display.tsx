import { Box, Typography, Paper } from '@mui/material';
import { Member } from '@mtes/types';
import { WithId } from 'mongodb';

interface MemberDisplayProps {
  member: WithId<Member>;
}

export const MemberDisplay = ({ member }: MemberDisplayProps) => {
  return (
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
  );
};
