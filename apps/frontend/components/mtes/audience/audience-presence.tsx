import { Member } from '@mtes/types';
import { Box, Typography, Grid, Paper, keyframes } from '@mui/material';
import { WithId } from 'mongodb';
import { MemberDisplay } from '../member-display';
import { useEffect, useRef, useState, useMemo } from 'react';

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
    0% {transform: translateY(0)}
    100% {transform: translateY(-50%)}
  `;
  const marqueeAnimation = `${marquee} 20s linear infinite`;

  // Group members by city and sort by city name
  const membersByCity = useMemo(() => {
    const grouped = members.reduce((acc, member) => {
      const city = member.city;
      if (!acc[city]) {
        acc[city] = [];
      }
      acc[city].push(member);
      return acc;
    }, {} as Record<string, WithId<Member>[]>);

    // Sort cities alphabetically and return as array of [city, members] tuples
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'he'));
  }, [members]);

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
          <Box
            ref={gridRef}
            sx={{
              animation: shouldAnimate ? marqueeAnimation : 'none'
            }}
          >
            {/* First copy of content */}
            {membersByCity.map(([city, cityMembers]) => (
              <Box key={city} sx={{ mb: 4 }}>
                <Typography
                  variant="h4"
                  component="h2"
                  sx={{
                    mb: 3,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    color: 'primary.main',
                    borderBottom: '2px solid',
                    borderColor: 'primary.main',
                    pb: 1
                  }}
                >
                  {city}
                </Typography>
                <Grid container spacing={3}>
                  {cityMembers.map(member => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={member._id.toString()}>
                      <MemberDisplay member={member} />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}
            {/* Second copy of content for seamless loop */}
            {shouldAnimate &&
              membersByCity.map(([city, cityMembers]) => (
                <Box key={`duplicate-${city}`} sx={{ mb: 4 }}>
                  <Typography
                    variant="h4"
                    component="h2"
                    sx={{
                      mb: 3,
                      fontWeight: 'bold',
                      textAlign: 'center',
                      color: 'primary.main',
                      borderBottom: '2px solid',
                      borderColor: 'primary.main',
                      pb: 1
                    }}
                  >
                    {city}
                  </Typography>
                  <Grid container spacing={3}>
                    {cityMembers.map(member => (
                      <Grid
                        item
                        xs={12}
                        sm={6}
                        md={4}
                        lg={3}
                        key={`duplicate-${member._id.toString()}`}
                      >
                        <MemberDisplay member={member} />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ))}
          </Box>
        </Box>
      )}
    </Paper>
  );
};
