import { Box, Typography } from '@mui/material';
import { WithId } from 'mongodb';
import { Member, VotingStatus } from '@mtes/types';
import { MemberCard } from './member-card';

interface MembersGridProps {
  members: WithId<Member>[];
  votedMembers: WithId<VotingStatus>[];
  standStatuses: Record<number, { status: string; member: Member | null }>;
  showVoted?: boolean;
  onMemberClick?: (member: Member) => void;
}

export const MembersGrid = ({
  members,
  votedMembers,
  standStatuses,
  showVoted = false,
  onMemberClick
}: MembersGridProps) => {
  const filteredMembers = members.filter(member => {
    const hasVoted = votedMembers.some(vm => vm.memberId.toString() === member._id.toString());
    return showVoted ? hasVoted : !hasVoted;
  });

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" color={showVoted ? 'success.main' : 'primary'} gutterBottom>
        {showVoted ? 'הצביעו' : 'ממתינים להצבעה'} ({filteredMembers.length})
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: 2
        }}
      >
        {filteredMembers.map(member => {
          const hasVoted = votedMembers.some(
            vm => vm.memberId.toString() === member._id.toString()
          );
          const isCurrentlyVoting = Object.values(standStatuses).some(
            s => s.member?.name === member.name
          );

          return (
            <MemberCard
              key={member._id.toString()}
              member={member}
              hasVoted={hasVoted}
              isCurrentlyVoting={isCurrentlyVoting}
              onClick={() => !isCurrentlyVoting && !hasVoted && onMemberClick?.(member)}
            />
          );
        })}
      </Box>
    </Box>
  );
};
