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
import { useSnackbar } from 'notistack';

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
  const [selectedRound, setSelectedRound] = useState<WithId<Round> | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  const handleDisplayChange = (event: SelectChangeEvent<string>) => {
    const newDisplay = event.target.value as AudienceDisplayScreen;
    setDisplay(newDisplay);
    setSelectedRound(null);
  };
  const handleSend = () => {
    const payload: Record<string, any> = { display };
    if (display === 'round') payload.round = selectedRound;
    console.log('Sending audience display update:', payload);
    socket.emit('updateAudienceDisplay', payload, (response: { ok: boolean; error?: string }) => {
      if (response.ok) {
        enqueueSnackbar('תצוגת הקהל עודכנה בהצלחה', { variant: 'success' });
      } else {
        enqueueSnackbar(`שגיאה בעדכון תצוגת הקהל: ${response.error || 'שגיאה לא ידועה'}`, {
          variant: 'error'
        });
      }
    });
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
              value={selectedRound?._id.toString() || ''}
              label="Round"
              onChange={e =>
                setSelectedRound(rounds.find(r => r._id.toString() === e.target.value) || null)
              }
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
