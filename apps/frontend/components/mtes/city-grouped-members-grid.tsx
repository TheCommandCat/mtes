import { Box, Typography, keyframes } from '@mui/material';
import { WithId } from 'mongodb';
import { Member, VotingStandStatus, VotingStatus } from '@mtes/types';
import { MemberCard } from './member-card';
import { useEffect, useRef, useState, useMemo } from 'react';

interface CityGroupedMembersGridProps {
  members: WithId<Member>[];
  votedMembers: WithId<VotingStatus>[];
  standStatuses: Record<number, VotingStandStatus>;
  filterType: 'waitingToVote' | 'voted' | 'notPresent';
  title: string;
  titleColor: string;
}

export const CityGroupedMembersGrid = ({
  members,
  votedMembers,
  standStatuses,
  filterType,
  title,
  titleColor
}: CityGroupedMembersGridProps) => {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const marquee = keyframes`
    0% {transform: translateY(0)}
    100% {transform: translateY(-50%)}
  `;
  const marqueeAnimation = `${marquee} 30s linear infinite`;

  // Filter members based on type
  const filteredMembers = members.filter(member => {
    const hasVoted = votedMembers.some(vm => vm.memberId.toString() === member._id.toString());
    const isAssignedToStand = Object.values(standStatuses).some(
      s => s.member?._id.toString() === member._id.toString()
    );

    switch (filterType) {
      case 'voted':
        return hasVoted;
      case 'notPresent':
        return !member.isPresent;
      case 'waitingToVote':
        return member.isPresent && !hasVoted && !isAssignedToStand;
      default:
        return false;
    }
  });

  // Group members by city and sort by city name
  const membersByCity = useMemo(() => {
    const grouped = filteredMembers.reduce((acc, member) => {
      const city = member.city;
      if (!acc[city]) {
        acc[city] = [];
      }
      acc[city].push(member);
      return acc;
    }, {} as Record<string, WithId<Member>[]>);

    // Sort cities alphabetically and return as array of [city, members] tuples
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'he'));
  }, [filteredMembers]);

  useEffect(() => {
    if (gridRef.current && containerRef.current) {
      const hasOverflow = gridRef.current.scrollHeight > containerRef.current.clientHeight;
      setShouldAnimate(hasOverflow);
    } else {
      setShouldAnimate(false);
    }
  }, [filteredMembers]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" color={titleColor} gutterBottom sx={{ mb: 2, flexShrink: 0 }}>
        {title} ({filteredMembers.length})
      </Typography>
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }} ref={containerRef}>
        <Box
          ref={gridRef}
          sx={{
            animation: shouldAnimate ? marqueeAnimation : 'none'
          }}
        >
          {/* First copy of content */}
          {membersByCity.map(([city, cityMembers]) => (
            <Box key={city} sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                component="h3"
                sx={{
                  mb: 2,
                  fontWeight: 'bold',
                  textAlign: 'center',
                  color: 'primary.main',
                  borderBottom: '1px solid',
                  borderColor: 'primary.main',
                  pb: 0.5
                }}
              >
                {city}
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 1.5,
                  px: 1
                }}
              >
                {cityMembers.map(member => {
                  const hasVoted = votedMembers.some(
                    vm => vm.memberId.toString() === member._id.toString()
                  );
                  const currentStandStatus = Object.values(standStatuses).find(
                    s => s.member?._id.toString() === member._id.toString()
                  );
                  const isCurrentlyVoting = !!currentStandStatus;
                  const currentStandId = currentStandStatus
                    ? Object.keys(standStatuses).find(
                        key => standStatuses[parseInt(key)] === currentStandStatus
                      )
                    : null;

                  const votingStatusEntry = votedMembers.find(
                    vm => vm.memberId.toString() === member._id.toString()
                  );
                  const signaturePoints = votingStatusEntry?.signature as
                    | Record<string, number[][]>
                    | undefined;

                  return (
                    <MemberCard
                      key={member._id.toString()}
                      member={member}
                      hasVoted={hasVoted}
                      isCurrentlyVoting={isCurrentlyVoting}
                      signatureData={hasVoted && signaturePoints ? signaturePoints : undefined}
                      currentStandId={currentStandId ? parseInt(currentStandId) : undefined}
                      audianceDisplay={true}
                    />
                  );
                })}
              </Box>
            </Box>
          ))}

          {/* Second copy of content for seamless loop */}
          {shouldAnimate &&
            membersByCity.map(([city, cityMembers]) => (
              <Box key={`duplicate-${city}`} sx={{ mb: 3 }}>
                <Typography
                  variant="h6"
                  component="h3"
                  sx={{
                    mb: 2,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    color: 'primary.main',
                    borderBottom: '1px solid',
                    borderColor: 'primary.main',
                    pb: 0.5
                  }}
                >
                  {city}
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 1.5,
                    px: 1
                  }}
                >
                  {cityMembers.map(member => {
                    const hasVoted = votedMembers.some(
                      vm => vm.memberId.toString() === member._id.toString()
                    );
                    const currentStandStatus = Object.values(standStatuses).find(
                      s => s.member?._id.toString() === member._id.toString()
                    );
                    const isCurrentlyVoting = !!currentStandStatus;
                    const currentStandId = currentStandStatus
                      ? Object.keys(standStatuses).find(
                          key => standStatuses[parseInt(key)] === currentStandStatus
                        )
                      : null;

                    const votingStatusEntry = votedMembers.find(
                      vm => vm.memberId.toString() === member._id.toString()
                    );
                    const signaturePoints = votingStatusEntry?.signature as
                      | Record<string, number[][]>
                      | undefined;

                    return (
                      <MemberCard
                        key={`duplicate-${member._id.toString()}`}
                        member={member}
                        hasVoted={hasVoted}
                        isCurrentlyVoting={isCurrentlyVoting}
                        signatureData={hasVoted && signaturePoints ? signaturePoints : undefined}
                        currentStandId={currentStandId ? parseInt(currentStandId) : undefined}
                        audianceDisplay={true}
                      />
                    );
                  })}
                </Box>
              </Box>
            ))}
        </Box>
      </Box>
    </Box>
  );
};
