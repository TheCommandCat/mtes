import { AudienceDisplayScreen, AudienceDisplayScreenTypes, Round } from '@mtes/types';
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
import { localizedAudienceDisplayScreens } from 'apps/frontend/localization/displays';
import { WithId } from 'mongodb';
import React, { useState } from 'react';

interface AudienceControlProps {
  socket: any;
  defaultDisplay: AudienceDisplayScreen;
  rounds: WithId<Round>[]; // available rounds
}

export const AudienceControl: React.FC<AudienceControlProps> = ({
  socket,
  defaultDisplay,
  rounds
}) => {
  const [display, setDisplay] = useState(defaultDisplay);
  const [selectedRound, setSelectedRound] = useState<string>('');

  const handleDisplayChange = (event: SelectChangeEvent<string>) => {
    const newDisplay = event.target.value as AudienceDisplayScreen;
    setDisplay(newDisplay);
    setSelectedRound('');
  };

  const handleSend = () => {
    const payload: Record<string, any> = { display };
    if (display === 'round') payload.roundId = selectedRound;
    console.log('Sending audience display update:', payload);
    socket.emit('updateAudienceDisplay', payload);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        בקרת תצוגת קהל
      </Typography>
      <Box sx={{ mt: 2 }}>
        <FormControl fullWidth>
          <InputLabel id="display-select-label">תצוגה</InputLabel>
          <Select
            labelId="display-select-label"
            id="display-select"
            value={display}
            label="Display"
            onChange={handleDisplayChange}
          >
            {AudienceDisplayScreenTypes.map(type => (
              <MenuItem key={type} value={type}>
                {localizedAudienceDisplayScreens[type] || type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      {/* Additional parameters based on view */}
      {display === 'round' && (
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="round-select-label">Round</InputLabel>
            <Select
              labelId="round-select-label"
              id="round-select"
              value={selectedRound}
              label="Round"
              onChange={e => setSelectedRound(e.target.value as string)}
            >
              {rounds.map(r => (
                <MenuItem key={r._id.toString()} value={r._id.toString()}>
                  {r.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
      <Box sx={{ mt: 3 }}>
        <Button variant="contained" onClick={handleSend} fullWidth>
          Send
        </Button>
      </Box>
    </Paper>
  );
};
