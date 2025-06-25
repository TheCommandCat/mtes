import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { Member, VotingStates } from '@mtes/types';
import { WithId } from 'mongodb';

interface ReadOnlyStandStatusCardProps {
  standId: number;
  status: VotingStates;
  member: WithId<Member> | null;
}

export const ReadOnlyStandStatusCard = ({
  standId,
  status,
  member
}: ReadOnlyStandStatusCardProps) => {
  const isOccupied = !!member;

  return (
    <Card
      sx={{
        height: '100%',
        bgcolor: isOccupied ? 'grey.50' : 'grey.100',
        boxShadow: 3,
        border: '1px solid',
        borderColor: isOccupied ? 'primary.light' : 'divider',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: 6
        }
      }}
    >
      <CardContent sx={{ textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom fontWeight="bold" color="text.secondary">
          עמדה {standId}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 120
          }}
        >
          {member ? (
            <>
              <Typography variant="h5" fontWeight="medium" color="text.primary">
                {member.name}
              </Typography>
              <Typography color="text.secondary">{member.city}</Typography>
            </>
          ) : (
            <Typography color="text.secondary" variant="h6">
              פנויה
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
