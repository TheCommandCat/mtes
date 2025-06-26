import { Box } from '@mui/material';
import { Member, VotingStandStatus } from '@mtes/types';
import { StandStatusCard } from './stand-status-card';
import { WithId } from 'mongodb';

interface VotingStandsGridProps {
  standStatuses: Record<number, VotingStandStatus>;
  onCancel: (standId: number) => void;
  onDropMember: (member: WithId<Member>, standId: number) => void;
  onEmptyStandClick?: (standId: number) => void;
}

export const VotingStandsGrid = ({
  standStatuses,
  onCancel,
  onDropMember,
  onEmptyStandClick
}: VotingStandsGridProps) => {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 4 }}>
      {Object.entries(standStatuses).map(([standId, status]) => (
        <StandStatusCard
          key={standId}
          standId={parseInt(standId)}
          status={status.status}
          member={status.member}
          onCancel={onCancel}
          onDropMember={onDropMember}
          onEmptyStandClick={onEmptyStandClick}
        />
      ))}
    </Box>
  );
};
