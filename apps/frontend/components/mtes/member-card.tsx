import { Card, CardContent, Avatar, Box, Typography } from '@mui/material';
import { WithId } from 'mongodb';
import { Member } from '@mtes/types';
import { useDrag } from 'react-dnd';
import { ItemTypes } from '../../lib/dnd-types';

interface MemberCardProps {
  member: WithId<Member>;
  hasVoted?: boolean;
  isCurrentlyVoting?: boolean;
  currentStandId?: number | null; // To know if the member is in a stand and which one
  isDisplayedInStand?: boolean; // New prop
}

export const MemberCard = ({
  member,
  hasVoted,
  isCurrentlyVoting,
  currentStandId,
  isDisplayedInStand
}: MemberCardProps) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.MEMBER,
    item: { ...member, currentStandId }, // Pass member data and its current stand
    canDrag: !hasVoted && (isDisplayedInStand || !isCurrentlyVoting),
    collect: monitor => ({
      isDragging: !!monitor.isDragging()
    })
  }));

  return (
    <Card
      ref={drag as any} // Cast to any to resolve MUI Card ref type issue
      sx={{
        cursor: !hasVoted ? 'grab' : 'not-allowed',
        transition: 'all 0.2s ease',
        width: isDisplayedInStand ? '100%' : 'auto', // Make card take full width if in stand
        maxWidth: isDisplayedInStand ? '300px' : 'none', // Max width for cards in stands
        m: isDisplayedInStand ? 'auto' : 0, // Center card if in stand
        boxShadow: isDisplayedInStand ? 3 : isDragging ? 5 : 1,
        transform: isDragging
          ? 'scale(1.05)'
          : isDisplayedInStand
          ? 'none'
          : !hasVoted && !isCurrentlyVoting
          ? 'none'
          : 'none',
        '&:hover': {
          transform:
            !hasVoted && !isCurrentlyVoting && !isDisplayedInStand
              ? 'translateY(-2px)'
              : isDragging
              ? 'scale(1.05)'
              : 'none',
          boxShadow:
            !hasVoted && !isCurrentlyVoting && !isDisplayedInStand
              ? 3
              : isDisplayedInStand
              ? 3
              : isDragging
              ? 5
              : 1
        },
        opacity: isDragging ? 0.5 : 1,
        bgcolor: hasVoted
          ? 'jobseeker.main'
          : isCurrentlyVoting && isDisplayedInStand
          ? '#fff3e0'
          : 'background.paper' // Orange tint if voting in stand
      }}
    >
      <CardContent
        sx={{ p: isDisplayedInStand ? 1.5 : 2, textAlign: isDisplayedInStand ? 'center' : 'left' }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: isDisplayedInStand ? 1 : 2,
            flexDirection: isDisplayedInStand ? 'column' : 'row' // Stack vertically if in stand
          }}
        >
          <Avatar
            sx={{
              bgcolor: hasVoted ? 'success.main' : 'primary.main',
              width: isDisplayedInStand ? 56 : 40, // Larger avatar if in stand
              height: isDisplayedInStand ? 56 : 40, // Larger avatar if in stand
              mb: isDisplayedInStand ? 1 : 0 // Margin bottom for avatar if in stand
            }}
          >
            {member.name.charAt(0)}
          </Avatar>
          <Box>
            <Typography
              variant={isDisplayedInStand ? 'h6' : 'h6'}
              fontWeight={isDisplayedInStand ? 'bold' : 'normal'}
            >
              {member.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {member.city}
            </Typography>
            {hasVoted && (
              <Typography variant="body2" color="success.dark">
                הצביע
              </Typography>
            )}
            {isCurrentlyVoting &&
              currentStandId !== undefined &&
              currentStandId !== null &&
              !isDisplayedInStand && (
                <Typography variant="body2" color="warning.dark">
                  בעמדה {currentStandId}
                </Typography>
              )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
