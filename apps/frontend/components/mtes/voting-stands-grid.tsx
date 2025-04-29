import { Box } from '@mui/material';
import { Member, VotingStates } from '@mtes/types';
import { StandStatusCard } from './stand-status-card';

interface VotingStandsGridProps {
  standStatuses: Record<number, { status: VotingStates; member: Member | null }>;
  onCancel: (standId: number) => void;
}

export const VotingStandsGrid = ({ standStatuses, onCancel }: VotingStandsGridProps) => {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 4 }}>
      {Object.entries(standStatuses).map(([standId, status]) => (
        <StandStatusCard
          key={standId}
          standId={parseInt(standId)}
          status={status.status}
          member={status.member}
          onCancel={onCancel}
        />
      ))}
    </Box>
  );
};
