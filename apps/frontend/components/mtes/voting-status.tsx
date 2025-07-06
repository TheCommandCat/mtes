import { Box, Typography, Paper } from '@mui/material';

interface VotingStatusProps {
  votedCount: number;
  totalCount: number;
}

export const VotingStatus = ({ votedCount, totalCount }: VotingStatusProps) => {
  const percentage = Math.round((votedCount / totalCount) * 100);

  console.log(`Voted Count: ${votedCount}, Total Count: ${totalCount}, Percentage: ${percentage}%`);

  return (
    <Paper
      elevation={2}
      sx={{
        p: 4,
        mb: 4,
        background: 'linear-gradient(to right, #f5f5f5, #ffffff)',
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <Typography variant="h5" color="primary" gutterBottom>
        סטטוס הצבעה
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h3" fontWeight="bold" color="primary">
          {votedCount}
        </Typography>
        <Typography variant="h4" color="text.secondary">
          /
        </Typography>
        <Typography variant="h3" fontWeight="bold">
          {totalCount}
        </Typography>
      </Box>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
        {percentage}% מהמצביעים השלימו הצבעה
      </Typography>
    </Paper>
  );
};
