import { AudienceDisplayScreen, AudienceDisplayScreenTypes } from '@mtes/types';
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
import React, { useState } from 'react';

interface AudienceControlProps {
  socket: any;
  defaultDisplay: AudienceDisplayScreen;
}

export const AudienceControl: React.FC<AudienceControlProps> = ({ socket, defaultDisplay }) => {
  const [display, setDisplay] = useState(defaultDisplay);

  const handleDisplayChange = (event: SelectChangeEvent<string>) => {
    const newDisplay = event.target.value as AudienceDisplayScreen;
    setDisplay(newDisplay);
    console.log(`Updating audience display to: ${newDisplay}`);

    socket.emit('updateAudienceDisplay', newDisplay);
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
    </Paper>
  );
};
