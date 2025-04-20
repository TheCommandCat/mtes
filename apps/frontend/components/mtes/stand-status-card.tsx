import { Member, VotingStates } from '@mtes/types';
import { Box, Typography, Button } from '@mui/material';

interface StandStatusCardProps {
  standId: number;
  status: VotingStates;
  member?: Member | null;
  onCancel: (standId: number) => void;
}

export const StandStatusCard: React.FC<StandStatusCardProps> = ({
  standId,
  status,
  member,
  onCancel
}) => {
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
            boxShadow: 1
          }}
        >
          <Typography variant="h4" color="text.primary" gutterBottom>
            עמדה {standId}
          </Typography>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            אין סבב פעיל
          </Typography>
          <Typography variant="body2" color="text.secondary">
            בחר סבב מהרשימה או צור סבב חדש
          </Typography>
        </Box>
      );

    case 'Voting':
      return (
        <Box
          sx={{
            mb: 4,
            p: 4,
            textAlign: 'center',
            bgcolor: '#fff3e0',
            borderRadius: 2,
            boxShadow: 1
          }}
        >
          <Typography variant="h4" color="text.primary" gutterBottom>
            עמדה {standId}
          </Typography>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            {member?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            בהצבעה
          </Typography>
          {onCancel && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => onCancel(standId)}
              sx={{
                mt: 2
              }}
            >
              ביטול הצבעה
            </Button>
          )}
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
            boxShadow: 1
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
          sx={{
            mb: 4,
            p: 4,
            textAlign: 'center',
            bgcolor: '#e3f2fd',
            borderRadius: 2,
            boxShadow: 1
          }}
        >
          <Typography variant="h4" color="text.primary" gutterBottom>
            עמדה {standId}
          </Typography>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            No Member
          </Typography>
          <Typography variant="body2" color="text.secondary">
            בחר מצביע מהרשימה
          </Typography>
        </Box>
      );
  }
};
