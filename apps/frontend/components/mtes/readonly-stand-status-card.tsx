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
  return (
    <Card
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        height: '100%'
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom>
          עמדה {standId + 1}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 100
          }}
        >
          {member ? (
            <>
              <Typography variant="h5">{member.name}</Typography>
              <Typography color="text.secondary">{member.city}</Typography>
            </>
          ) : (
            <Typography color="text.secondary">עמדה פנויה</Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
