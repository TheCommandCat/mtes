import { Box, Typography } from '@mui/material';
import { WithId } from 'mongodb';
import { Member, VotingStatus } from '@mtes/types';
import { MemberCard } from './member-card';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '../../lib/dnd-types';

interface MembersGridProps {
  members: WithId<Member>[];
  votedMembers: WithId<VotingStatus>[];
  standStatuses: Record<number, { status: string; member: WithId<Member> | null }>; // Ensure member is WithId<Member>
  showVoted?: boolean;
  onDropMemberBackToBank: (member: WithId<Member>, previousStandId: number) => void; // Ensure member is WithId<Member>
  // Remove onMemberClick as it's not used with react-dnd for this component
}

export const MembersGrid = ({
  members,
  votedMembers,
  standStatuses,
  showVoted = false,
  onDropMemberBackToBank
}: MembersGridProps) => {
  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: ItemTypes.MEMBER,
      drop: (item: WithId<Member> & { currentStandId?: number | null }) => {
        // Ensure item is WithId<Member>
        if (item.currentStandId !== undefined && item.currentStandId !== null) {
          onDropMemberBackToBank(item, item.currentStandId);
        }
      },
      canDrop: (item: WithId<Member> & { currentStandId?: number | null }) => {
        // Ensure item is WithId<Member>
        return !showVoted && item.currentStandId !== undefined && item.currentStandId !== null;
      },
      collect: monitor => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop()
      })
    }),
    [showVoted, onDropMemberBackToBank]
  );

  const filteredMembers = members.filter(member => {
    const hasVoted = votedMembers.some(vm => vm.memberId.toString() === member._id.toString());
    // Ensure standStatuses member comparison uses _id
    const isAssignedToStand = Object.values(standStatuses).some(
      s => s.member?._id.toString() === member._id.toString()
    );

    if (showVoted) {
      return hasVoted;
    } else {
      return !hasVoted && !isAssignedToStand;
    }
  });

  const isActive = isOver && canDrop;
  let gridStyles: any = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: 2,
    p: 1,
    borderRadius: 1,
    border: '2px dashed transparent',
    bgcolor: 'transparent',
    minHeight: '100px'
  };

  if (!showVoted) {
    if (isActive) {
      gridStyles.border = '2px dashed #4caf50';
      gridStyles.bgcolor = '#e8f5e9';
    } else if (canDrop) {
      gridStyles.border = '2px dashed #bdbdbd';
    }
  }

  return (
    <Box sx={{ mb: 4 }} ref={!showVoted ? (drop as any) : null}>
      <Typography variant="h6" color={showVoted ? 'success.main' : 'primary'} gutterBottom>
        {showVoted ? 'הצביעו' : 'ממתינים להצבעה'} ({filteredMembers.length})
      </Typography>
      <Box sx={gridStyles}>
        {filteredMembers.map(member => {
          const hasVoted = votedMembers.some(
            vm => vm.memberId.toString() === member._id.toString()
          );
          const currentStandStatus = Object.values(standStatuses).find(
            s => s.member?._id.toString() === member._id.toString()
          );
          const isCurrentlyVoting = !!currentStandStatus;
          const currentStandId = currentStandStatus
            ? Object.keys(standStatuses).find(
                key => standStatuses[parseInt(key)] === currentStandStatus
              )
            : null;

          const votingStatusEntry = votedMembers.find(
            vm => vm.memberId.toString() === member._id.toString()
          );
          const signaturePoints = votingStatusEntry?.signature as
            | Record<string, number[][]>
            | undefined;

          return (
            <MemberCard
              key={member._id.toString()}
              member={member}
              hasVoted={hasVoted}
              isCurrentlyVoting={isCurrentlyVoting}
              signatureData={hasVoted && signaturePoints ? { points: signaturePoints } : undefined}
              currentStandId={currentStandId ? parseInt(currentStandId) : undefined}
            />
          );
        })}
        {!showVoted && filteredMembers.length === 0 && canDrop && (
          <Box sx={{ p: 2, textAlign: 'center', gridColumn: '1 / -1' }}>
            <Typography color="text.secondary">גרור לכאן להחזרה לבנק</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};
