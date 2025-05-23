import { Box, Typography } from '@mui/material';
import { WithId } from 'mongodb';
import { Member, VotingStatus } from '@mtes/types';
import { MemberCard } from './member-card';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '../../lib/dnd-types';

interface MembersGridProps {
  members: WithId<Member>[];
  votedMembers: WithId<VotingStatus>[];
  standStatuses: Record<number, { status: string; member: WithId<Member> | null }>;

  filterType: 'waitingToVote' | 'voted' | 'notPresent';
  onDropMemberBackToBank: (member: WithId<Member>, previousStandId: number) => void;
}

export const MembersGrid = ({
  members,
  votedMembers,
  standStatuses,
  filterType,
  onDropMemberBackToBank
}: MembersGridProps) => {
  const [{ isOver, canDrop }, drop] = useDrop<
    WithId<Member> & { currentStandId?: number | null },
    void,
    { isOver: boolean; canDrop: boolean }
  >(
    () => ({
      accept: ItemTypes.MEMBER,
      drop: (item: WithId<Member> & { currentStandId?: number | null }) => {
        if (item.currentStandId !== undefined && item.currentStandId !== null) {
          onDropMemberBackToBank(item, item.currentStandId);
        }
      },
      canDrop: (item: WithId<Member> & { currentStandId?: number | null }) => {
        return (
          filterType === 'waitingToVote' &&
          item.currentStandId !== undefined &&
          item.currentStandId !== null
        );
      },
      collect: monitor => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop()
      })
    }),
    [filterType, onDropMemberBackToBank]
  );

  const filteredMembers = members.filter(member => {
    const hasVoted = votedMembers.some(vm => vm.memberId.toString() === member._id.toString());
    const isAssignedToStand = Object.values(standStatuses).some(
      s => s.member?._id.toString() === member._id.toString()
    );

    switch (filterType) {
      case 'voted':
        return hasVoted;
      case 'notPresent':
        return !member.isPresent && !hasVoted;
      case 'waitingToVote':
        return member.isPresent && !hasVoted && !isAssignedToStand;
      default:
        return false;
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

  if (filterType === 'waitingToVote') {
    if (isActive) {
      gridStyles.border = '2px dashed #4caf50';
      gridStyles.bgcolor = '#e8f5e9';
    } else if (canDrop) {
      gridStyles.border = '2px dashed #bdbdbd';
    }
  }

  let title = '';
  let titleColor: string = 'primary'; // Explicitly type titleColor
  switch (filterType) {
    case 'voted':
      title = 'הצביעו';
      titleColor = 'success.main';
      break;
    case 'notPresent':
      title = 'לא נוכחים';
      titleColor = 'text.secondary';
      break;
    case 'waitingToVote':
      title = 'ממתינים להצבעה';
      // titleColor is already 'primary' by default
      break;
  }

  return (
    <Box
      sx={{ mb: 4 }}
      ref={
        filterType === 'waitingToVote'
          ? (node: HTMLElement | null) => {
              drop(node);
            }
          : null
      }
    >
      <Typography variant="h6" color={titleColor} gutterBottom>
        {title} ({filteredMembers.length})
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
              signatureData={hasVoted && signaturePoints ? signaturePoints : undefined}
              currentStandId={currentStandId ? parseInt(currentStandId) : undefined}
            />
          );
        })}
        {filterType === 'waitingToVote' && filteredMembers.length === 0 && canDrop && (
          <Box sx={{ p: 2, textAlign: 'center', gridColumn: '1 / -1' }}>
            <Typography color="text.secondary">גרור לכאן להחזרה לבנק</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};
