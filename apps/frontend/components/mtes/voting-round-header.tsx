import { Box, Typography } from '@mui/material';

interface VotingRoundHeaderProps {
  roundName: string;
}

export const VotingRoundHeader = ({ roundName }: VotingRoundHeaderProps) => {
  return (
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
        {roundName}
      </Typography>
    </Box>
  );
};
