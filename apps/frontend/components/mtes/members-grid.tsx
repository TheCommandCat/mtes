import { Box, keyframes, Typography } from '@mui/material';
import { WithId } from 'mongodb';
import { Member, VotingStatus } from '@mtes/types';
import { MemberCard } from './member-card';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '../../lib/dnd-types';
import { useEffect, useRef, useState } from 'react';

interface MembersGridProps {
  members: WithId<Member>[];
  votedMembers: WithId<VotingStatus>[];
  standStatuses: Record<number, { status: string; member: WithId<Member> | null }>;

  filterType: 'waitingToVote' | 'voted' | 'notPresent';
  onDropMemberBackToBank: (member: WithId<Member>, previousStandId: number) => void;
  audianceDisplay?: boolean; // Optional prop for audience display
}

export const MembersGrid = ({
  members,
  votedMembers,
  standStatuses,
  filterType,
  onDropMemberBackToBank,
  audianceDisplay = false
}: MembersGridProps) => {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Group by city for waitingToVote
  let groupedByCity: Record<string, typeof filteredMembers> = {};
  if (filterType === 'waitingToVote') {
    filteredMembers.forEach(member => {
      if (!groupedByCity[member.city]) groupedByCity[member.city] = [];
      groupedByCity[member.city].push(member);
    });
  }

  useEffect(() => {
    if (audianceDisplay && gridRef.current && containerRef.current) {
      const hasOverflow = gridRef.current.scrollHeight > containerRef.current.clientHeight;
      setShouldAnimate(hasOverflow);
    } else {
      setShouldAnimate(false);
    }
  }, [filteredMembers, audianceDisplay]);

  const marquee = keyframes`
    from {transform: translateY(0)}
    to {transform: translateY(-50%)}
  `;
  const marqueeAnimation = `${marquee} 30s linear infinite`;

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
      sx={{ mb: 4, height: '100%', display: 'flex', flexDirection: 'column' }}
      ref={
        filterType === 'waitingToVote'
          ? (node: HTMLElement | null) => {
              drop(node);
            }
          : null
      }
    >
      <Typography variant="h6" color={titleColor} gutterBottom sx={{ mb: 2, flexShrink: 0 }}>
        {title} ({filteredMembers.length})
      </Typography>
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }} ref={containerRef}>
        <Box
          sx={{
            animation: audianceDisplay && shouldAnimate ? marqueeAnimation : 'none'
          }}
          ref={gridRef}
        >
          {/* Group by city for waitingToVote, else flat list */}
          {filterType === 'waitingToVote' ? (
            Object.keys(groupedByCity).length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography color="text.secondary">אין חברים זמינים</Typography>
              </Box>
            ) : (
              Object.entries(groupedByCity).map(([city, cityMembers]) => (
                <Box key={city} sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" color="primary" sx={{ mb: 1, fontWeight: 700 }}>
                    {city}
                  </Typography>
                  <Box sx={gridStyles}>
                    {cityMembers.map(member => {
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
                          audianceDisplay={audianceDisplay}
                        />
                      );
                    })}
                  </Box>
                </Box>
              ))
            )
          ) : (
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
                    audianceDisplay={audianceDisplay}
                  />
                );
              })}
              {filteredMembers.length === 0 && canDrop && (
                <Box sx={{ p: 2, textAlign: 'center', gridColumn: '1 / -1' }}>
                  <Typography color="text.secondary">גרור לכאן להחזרה לבנק</Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Duplicate content for seamless loop when animating */}
          {audianceDisplay && shouldAnimate && (
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
                    key={`duplicate-${member._id.toString()}`}
                    member={member}
                    hasVoted={hasVoted}
                    isCurrentlyVoting={isCurrentlyVoting}
                    signatureData={hasVoted && signaturePoints ? signaturePoints : undefined}
                    currentStandId={currentStandId ? parseInt(currentStandId) : undefined}
                    audianceDisplay={audianceDisplay}
                  />
                );
              })}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};
