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
        gridTemplateColumns: '1fr',
        gridAutoFlow: 'column',
        overflowX: 'auto',
        gap: 3,
        mb: 5,
        p: 2,
        backgroundColor: '#f5f5f5',
        borderRadius: 2
      }}
    >
      {Object.entries(standStatuses).map(([standId, status]) => (
        <Box
          key={standId}
          sx={{
            transform: 'translateY(0)',
            transition: 'transform 0.2s',
            minWidth: '300px',
            '&:hover': { transform: 'translateY(-4px)' }
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
