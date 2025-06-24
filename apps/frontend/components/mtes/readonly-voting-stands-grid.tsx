import { Box } from '@mui/material';
import { VotingStandStatus } from '@mtes/types';
import { ReadOnlyStandStatusCard } from './readonly-stand-status-card';

interface ReadOnlyVotingStandsGridProps {
  standStatuses: Record<number, VotingStandStatus>;
}

export const ReadOnlyVotingStandsGrid = ({ standStatuses }: ReadOnlyVotingStandsGridProps) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 3,
        p: 2,
        borderRadius: 2
      }}
    >
      {Object.entries(standStatuses).map(([standId, status]) => (
        <Box
          key={standId}
          sx={{
            transition: 'transform 0.2s ease-in-out',
            '&:hover': { transform: 'translateY(-5px)' }
          }}
        >
          <ReadOnlyStandStatusCard
            standId={parseInt(standId)}
            status={status.status}
            member={status.member}
          />
        </Box>
      ))}
    </Box>
  );
};
