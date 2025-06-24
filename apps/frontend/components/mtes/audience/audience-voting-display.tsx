import { Box, Grid, Typography } from '@mui/material';
import { WithId } from 'mongodb';
import { Cities, Member, VotingStandStatus, VotingStates, VotingStatus } from '@mtes/types';
import { MembersColumn } from '../members-column';
import { ReadOnlyVotingStandsGrid } from '../readonly-voting-stands-grid';
import { DndContext, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { MembersGrid } from '../members-grid';

interface AudienceVotingDisplayProps {
  members: WithId<Member>[];
  votedMembers: WithId<VotingStatus>[];
  standStatuses: Record<number, VotingStandStatus>;
}

export const AudienceVotingDisplay = ({
  members,
  votedMembers,
  standStatuses
}: AudienceVotingDisplayProps) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <Box sx={{ width: '100%', p: { xs: 2, sm: 4 } }}>
        <Typography
          variant="h2"
          gutterBottom
          textAlign="center"
          color="primary"
          sx={{ fontWeight: 'bold', mb: 4 }}
        >
          מעקב הצבעה
        </Typography>

        <Box sx={{ mb: 5 }}>
          <Typography
            variant="h4"
            gutterBottom
            textAlign="center"
            color="text.primary"
            sx={{ mb: 2 }}
          >
            עמדות הצבעה
          </Typography>
          <ReadOnlyVotingStandsGrid standStatuses={standStatuses} />
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <MembersGrid
              members={members}
              votedMembers={votedMembers}
              standStatuses={standStatuses}
              filterType="waitingToVote"
              onDropMemberBackToBank={() => {}}
              audianceDisplay={true}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <MembersGrid
              members={members}
              votedMembers={votedMembers}
              standStatuses={standStatuses}
              filterType="voted"
              onDropMemberBackToBank={() => {}}
              audianceDisplay={true}
            />
          </Grid>
        </Grid>
      </Box>
    </DndProvider>
  );
};
