import React from 'react';
import { Member } from '@mtes/types';
import { Container, Typography, Paper, Avatar, Box } from '@mui/material';
import { WaitingState } from 'apps/frontend/components/mtes/waiting-state';
import { WithId } from 'mongodb';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';

interface AudienceMemberDisplayProps {
  selectedMember: WithId<Member> | null;
}

const AudienceMemberDisplay: React.FC<AudienceMemberDisplayProps> = ({ selectedMember }) => {
  if (!selectedMember) {
    return (
      <Box
        sx={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f8f9fa'
        }}
      >
        <WaitingState title="לא נבחר חבר" subtitle="יש לבחור חבר להצגה" />
      </Box>
    );
  }

  const displayName = selectedMember.replacedBy
    ? selectedMember.replacedBy.name
    : selectedMember.name;
  const displayInitial = displayName.charAt(0);

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f8f9fa',
        position: 'relative'
      }}
    >
      {/* Clean Member Card */}
      <Paper
        elevation={3}
        sx={{
          p: { xs: 6, sm: 8, md: 10 },
          bgcolor: 'white',
          borderRadius: 3,
          textAlign: 'center',
          width: '90%',
          maxWidth: '1200px',
          border: '1px solid #e0e0e0'
        }}
      >
        {/* Avatar */}
        <Avatar
          sx={{
            width: { xs: 150, sm: 200, md: 250 },
            height: { xs: 150, sm: 200, md: 250 },
            margin: '0 auto',
            mb: 4,
            bgcolor: 'primary.main',
            fontSize: { xs: '60px', sm: '80px', md: '100px' },
            fontWeight: 'bold'
          }}
        >
          {displayInitial}
        </Avatar>

        {/* Member Name */}
        <Typography
          variant="h2"
          component="h1"
          sx={{
            mb: 3,
            fontWeight: 'bold',
            color: 'text.primary',
            fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' }
          }}
        >
          {displayName}
        </Typography>

        {/* City */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
          <LocationOnIcon
            sx={{
              mr: 2,
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              color: 'text.secondary'
            }}
          />
          <Typography
            variant="h4"
            color="text.secondary"
            sx={{
              fontWeight: 'medium',
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
            }}
          >
            {selectedMember.city}
          </Typography>
        </Box>

        {/* Replacement Information */}
        {selectedMember.replacedBy && (
          <Box
            sx={{
              mt: 4,
              p: 3,
              bgcolor: '#f5f5f5',
              borderRadius: 2,
              border: '1px solid #e0e0e0'
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1
              }}
            >
              <SwapHorizIcon
                sx={{
                  mr: 2,
                  fontSize: { xs: '1.5rem', sm: '2rem' },
                  color: 'text.secondary'
                }}
              />
              <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                מחליף/ה
              </Typography>
            </Box>
            <Typography variant="h6" color="text.secondary">
              מחליף/ה את {selectedMember.name}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default AudienceMemberDisplay;
