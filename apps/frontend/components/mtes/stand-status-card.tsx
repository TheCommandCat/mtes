import { Member, VotingStates } from '@mtes/types';
import { Box, Typography } from '@mui/material';

interface StandStatusCardProps {
  standId: number;
  status: VotingStates;
  member?: Member | null;
}

export const StandStatusCard: React.FC<StandStatusCardProps> = ({ standId, status, member }) => {
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
