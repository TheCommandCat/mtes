import {
  Paper,
  Typography,
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import React, { useState } from 'react';

interface AudienceControlProps {
  socket: any; // Replace with a more specific type for the socket
}

export const AudienceControl: React.FC<AudienceControlProps> = ({ socket }) => {
  const [display, setDisplay] = useState('round');

  const handleDisplayChange = (event: SelectChangeEvent<string>) => {
    const newDisplay = event.target.value;
    setDisplay(newDisplay);
    console.log(`Updating audience display to: ${newDisplay}`);

    socket.emit('updateAudienceDisplay', newDisplay);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Audience Display Control
      </Typography>
      <Box sx={{ mt: 2 }}>
        <FormControl fullWidth>
          <InputLabel id="display-select-label">Display</InputLabel>
          <Select
            labelId="display-select-label"
            id="display-select"
            value={display}
            label="Display"
            onChange={handleDisplayChange}
          >
            <MenuItem value="round">Round</MenuItem>
            <MenuItem value="presence">Presence</MenuItem>
            <MenuItem value="voting">Voting</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Paper>
  );
};
