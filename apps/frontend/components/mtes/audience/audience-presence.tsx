import { Member } from '@mtes/types';
import { Box, Typography, Grid, Paper } from '@mui/material';
import { WithId } from 'mongodb';
import { MemberDisplay } from '../member-display';

export interface AudiencePresenceProps {
  members: WithId<Member>[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
}

export const AudiencePresence = ({
  members,
  isLoading = false,
  isError = false,
  errorMessage = 'Failed to load members'
}: AudiencePresenceProps) => {
  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 4 }, width: '100%' }}>
      <Typography
        variant="h2"
        component="h1"
        sx={{ mb: 4, fontWeight: 'bold', textAlign: 'center' }}
      >
        נוכחות
      </Typography>
      {isLoading && <Typography variant="body1">Loading...</Typography>}
      {isError && (
        <Typography variant="body1" color="error">
          {errorMessage}
        </Typography>
      )}
      {!isLoading && !isError && (
        <Grid container spacing={3}>
          {members.map(member => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={member._id.toString()}>
              <MemberDisplay member={member} />
            </Grid>
          ))}
        </Grid>
      )}
    </Paper>
  );
};
