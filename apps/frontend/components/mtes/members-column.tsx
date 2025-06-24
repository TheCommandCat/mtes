import { Box, Typography } from '@mui/material';
import { WithId } from 'mongodb';
import { Member } from '@mtes/types';
import { MemberCard } from './member-card';

interface MembersColumnProps {
  title: string;
  members: WithId<Member>[];
}

export const MembersColumn = ({ title, members }: MembersColumnProps) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {title} ({members.length})
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: 2,
          p: 1
        }}
      >
        {members.map(member => (
          <MemberCard
            key={member._id.toString()}
            member={member}
            hasVoted={false}
            isCurrentlyVoting={false}
          />
        ))}
      </Box>
    </Box>
  );
};
