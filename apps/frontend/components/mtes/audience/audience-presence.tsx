import { Member } from '@mtes/types';
import { Box, Typography, Grid, Paper, keyframes } from '@mui/material';
import { WithId } from 'mongodb';
import { MemberDisplay } from '../member-display';
import { useEffect, useRef, useState } from 'react';

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
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const marquee = keyframes`
    from {transform: translateY(0)}
    to {transform: translateY(-100%)}
  `;
  const marqueeAnimation = `${marquee} 25s linear infinite`;

  useEffect(() => {
    if (gridRef.current && containerRef.current) {
      const hasOverflow = gridRef.current.scrollHeight > containerRef.current.clientHeight;
      setShouldAnimate(hasOverflow);
    } else {
      setShouldAnimate(false);
    }
  }, [members]);

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
        <Box sx={{ height: '70vh', overflow: 'hidden' }} ref={containerRef}>
          <Grid
            container
            spacing={3}
            ref={gridRef}
            sx={{
              animation: shouldAnimate ? marqueeAnimation : 'none'
            }}
          >
            {members.map(member => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={member._id.toString()}>
                <MemberDisplay member={member} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Paper>
  );
};
