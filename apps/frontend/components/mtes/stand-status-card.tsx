import { Member, VotingStates } from '@mtes/types';
import { Box, Typography, Button } from '@mui/material';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '../../lib/dnd-types';
import { MemberCard } from './member-card';
import { WithId } from 'mongodb'; // Import WithId

interface StandStatusCardProps {
  standId: number;
  status: VotingStates;
  member?: WithId<Member> | null; // Ensure member is WithId<Member>
  onCancel: (standId: number) => void;
  onDropMember: (member: WithId<Member>, standId: number, previousStandId?: number | null) => void;
}

export const StandStatusCard: React.FC<StandStatusCardProps> = ({
  standId,
  status,
  member,
  onCancel,
  onDropMember
}) => {
  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: ItemTypes.MEMBER,
      drop: (item: WithId<Member> & { currentStandId?: number | null }) => {
        // Ensure item is WithId<Member>
        if (item.currentStandId === standId) return;
        onDropMember(item, standId, item.currentStandId);
      },
      canDrop: (item: WithId<Member> & { currentStandId?: number | null }) => {
        // Ensure item is WithId<Member>
        return (
          status === 'Empty' ||
          (status === 'Voting' && item.currentStandId === standId) ||
          (status === 'Voting' && member === null)
        );
      },
      collect: monitor => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop()
      })
    }),
    [status, member, standId, onDropMember]
  );

  const isActive = isOver && canDrop;
  let backgroundColor = 'background.default';
  if (isActive) {
    backgroundColor = '#e3f2fd';
  } else if (canDrop) {
    backgroundColor = '#f5f5f5';
  }

  if (status === 'Voting' && member) {
    return (
      <Box
        ref={drop as any} // Cast to any to resolve MUI Box ref type issue
        sx={{
          mb: 4,
          p: 2,
          textAlign: 'center',
          bgcolor: backgroundColor,
          borderRadius: 2,
          boxShadow: 1,
          border: isActive ? '2px dashed #90caf9' : '2px dashed transparent',
          minHeight: '150px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        <Typography variant="h6" color="text.primary" gutterBottom sx={{ flexShrink: 0 }}>
          עמדה {standId}
        </Typography>
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            p: 1
          }}
        >
          {/* Ensure member prop passed to MemberCard is WithId<Member> */}
          <MemberCard
            member={member}
            isCurrentlyVoting={true}
            currentStandId={standId}
            isDisplayedInStand={true}
          />
        </Box>
        {onCancel && (
          <Button
            variant="outlined"
            color="error"
            onClick={() => onCancel(standId)}
            sx={{ mt: 1, flexShrink: 0 }}
          >
            ביטול הצבעה
          </Button>
        )}
      </Box>
    );
  }

  switch (status) {
    case 'NotStarted':
      return (
        <Box
          sx={{
            mb: 4,
            p: 4,
            textAlign: 'center',
            bgcolor: 'background.default',
            borderRadius: 2,
            boxShadow: 1,
            minHeight: '150px'
          }}
        >
          <Typography variant="h4" color="text.primary" gutterBottom>
            עמדה {standId + 1}
          </Typography>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            אין סבב פעיל
          </Typography>
          <Typography variant="body2" color="text.secondary">
            בחר סבב מהרשימה או צור סבב חדש
          </Typography>
        </Box>
      );

    case 'VotingSubmitted':
      return (
        <Box
          sx={{
            mb: 4,
            p: 4,
            textAlign: 'center',
            bgcolor: '#e8f5e9',
            borderRadius: 2,
            boxShadow: 1,
            minHeight: '150px'
          }}
        >
          <Typography variant="h4" color="text.primary" gutterBottom>
            עמדה {standId}
          </Typography>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            {member?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            הצבעה הוגשה
          </Typography>
        </Box>
      );

    case 'Empty':
      return (
        <Box
          ref={drop as any} // Cast to any to resolve MUI Box ref type issue
          sx={{
            mb: 4,
            p: 4,
            textAlign: 'center',
            bgcolor: backgroundColor,
            borderRadius: 2,
            boxShadow: 1,
            border: isActive ? '2px dashed #90caf9' : '2px dashed transparent',
            minHeight: '150px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Typography variant="h4" color="text.primary" gutterBottom>
            עמדה {standId}
          </Typography>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            גרור לכאן מצביע
          </Typography>
        </Box>
      );
    default:
      return null;
  }
};
