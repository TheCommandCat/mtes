import {
  Card,
  CardContent,
  Avatar,
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { WithId } from 'mongodb';
import { Member } from '@mtes/types';
import { useDrag } from 'react-dnd';
import { ItemTypes } from '../../lib/dnd-types';
import React, { useState } from 'react';
import Signature from '@uiw/react-signature'; // Import Signature

interface MemberCardProps {
  member: WithId<Member>;
  hasVoted?: boolean;
  isCurrentlyVoting?: boolean;
  currentStandId?: number | null;
  isDisplayedInStand?: boolean;
  signatureData?: Record<number, number[][]>;
  audianceDisplay?: boolean;
}

export const MemberCard = ({
  member,
  hasVoted,
  isCurrentlyVoting,
  currentStandId,
  isDisplayedInStand,
  signatureData,
  audianceDisplay = false
}: MemberCardProps) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.MEMBER,
    item: { ...member, currentStandId },
    canDrag: !hasVoted && (isDisplayedInStand || !isCurrentlyVoting),
    collect: monitor => ({
      isDragging: !!monitor.isDragging()
    })
  }));

  const [openSignatureDialog, setOpenSignatureDialog] = useState(false);

  const handleOpenSignatureDialog = () => {
    setOpenSignatureDialog(true);
  };

  const handleCloseSignatureDialog = () => {
    setOpenSignatureDialog(false);
  };

  return (
    <>
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
          sx={{
            p: isDisplayedInStand ? 1.5 : 2,
            textAlign: isDisplayedInStand ? 'center' : 'left'
          }}
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
              {member.replacedBy && (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    mt: 0.5,
                    fontStyle: 'italic',
                    color: 'text.secondary'
                  }}
                >
                  <span role="img" aria-label="replaced">
                    🔄
                  </span>
                  מוחלפ.ת על ידי:{' '}
                  <Typography
                    component="span"
                    variant="caption"
                    fontWeight="bold"
                    color="text.primary"
                  >
                    {member.replacedBy.name}
                  </Typography>
                </Typography>
              )}
              {hasVoted && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Typography variant="body2" color="success.dark">
                    הצביע
                  </Typography>
                  {signatureData && signatureData && !audianceDisplay && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleOpenSignatureDialog}
                      sx={{ ml: 1, p: '2px 8px', fontSize: '0.75rem', lineHeight: '1.2' }}
                    >
                      צפה בחתימה
                    </Button>
                  )}
                </Box>
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
      {signatureData && signatureData && (
        <Dialog
          open={openSignatureDialog}
          onClose={handleCloseSignatureDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>חתימת חבר</DialogTitle>
          <DialogContent
            sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}
          >
            <Box
              sx={{
                border: '1px solid rgba(0,0,0,0.23)',
                borderRadius: 1,
                width: '100%',
                maxWidth: '400px',
                height: '200px',
                backgroundColor: '#f7f7f7'
              }}
            >
              <Signature
                width="100%"
                height="100%"
                defaultPoints={signatureData}
                readonly
                style={{ '--w-signature-background': 'transparent' } as React.CSSProperties}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseSignatureDialog}>סגור</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};
