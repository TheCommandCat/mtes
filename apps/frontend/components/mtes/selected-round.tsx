import { Round } from '@mtes/types';
import { Typography, Stack, Box, Button } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import React from 'react';

interface SelectedRoundProps {
  selectedRound: Round;
  setSelectedRound: (round: Round | null) => void;
  handleStartRound: (round: Round) => void;
}

export const SelectedRound: React.FC<SelectedRoundProps> = ({
  selectedRound,
  setSelectedRound,
  handleStartRound
}) => {
  return (
    <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
      <Typography variant="h5" align="center">
        {selectedRound.name}
      </Typography>
      <Stack direction="row" sx={{ justifyContent: 'space-evenly', p: 2 }}>
        {selectedRound.roles.map(role => (
          <Box key={role.role} sx={{ boxShadow: 1, p: 2, borderRadius: 1, outline: 1 }}>
            <Typography variant="h4" align="center" sx={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              {role.role}
            </Typography>
            <Stack direction="column" spacing={1}>
              {role.contestants.map(contestant => (
                <Typography key={contestant.name} variant="subtitle1" align="center">
                  {contestant.name}
                </Typography>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
      <Typography variant="subtitle1" align="center">
        {selectedRound.allowedMembers.length} מצביעים מורשים
      </Typography>
      <Stack direction="row" gap={1} sx={{ justifyContent: 'center', mt: 2 }}>
        <Button
          variant="outlined"
          color="primary"
          size="small"
          onClick={() => {
            setSelectedRound(null);
          }}
          startIcon={<ArrowBackIcon />}
          sx={{ ml: 2, direction: 'ltr' }}
        >
          חזור
        </Button>
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={() => handleStartRound(selectedRound)}
          startIcon={<SendIcon />}
          sx={{ direction: 'ltr' }}
        >
          התחל הצבעה
        </Button>
      </Stack>
    </Box>
  );
};
