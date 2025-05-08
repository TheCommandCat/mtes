import { Box } from '@mui/material';
import { Member, VotingStandStatus, VotingStates } from '@mtes/types';
import { StandStatusCard } from './stand-status-card';
import { WithId } from 'mongodb';

interface VotingStandsGridProps {
  standStatuses: Record<number, VotingStandStatus>;
  onCancel: (standId: number) => void;
  onDropMember: (member: WithId<Member>, standId: number) => void;
}

export const VotingStandsGrid = ({
  standStatuses,
  onCancel,
  onDropMember
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
        />
      ))}
    </Box>
  );
};
