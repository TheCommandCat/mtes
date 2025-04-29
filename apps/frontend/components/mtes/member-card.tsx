import { Card, CardContent, Avatar, Box, Typography } from '@mui/material';
import { WithId } from 'mongodb';
import { Member } from '@mtes/types';

interface MemberCardProps {
  member: WithId<Member>;
  hasVoted?: boolean;
  isCurrentlyVoting?: boolean;
  onClick?: () => void;
}

export const MemberCard = ({ member, hasVoted, isCurrentlyVoting, onClick }: MemberCardProps) => {
  return (
    <Card
      sx={{
        cursor: isCurrentlyVoting || hasVoted ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: isCurrentlyVoting || hasVoted ? 'none' : 'translateY(-2px)',
          boxShadow: isCurrentlyVoting || hasVoted ? 1 : 3
        },
        opacity: isCurrentlyVoting ? 0.6 : 1,
        bgcolor: hasVoted ? 'jobseeker.main' : 'background.paper'
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: hasVoted ? 'success.main' : 'primary.main' }}>
            {member.name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h6">{member.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {member.city}
            </Typography>
            {hasVoted && (
              <Typography variant="body2" color="success.dark">
                הצביע
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
