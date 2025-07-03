import { AudienceDisplayScreen, AudienceDisplayScreenTypes, Round, Member } from '@mtes/types';
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
  audienceDisplayState: {
    display: AudienceDisplayScreen;
    round?: WithId<Round> | null;
    member?: WithId<Member> | null;
  };
  rounds: WithId<Round>[]; // available rounds
  members: WithId<Member>[]; // available members
}

export const AudienceControl: React.FC<AudienceControlProps> = ({
  socket,
  audienceDisplayState: eventState,
  rounds,
  members
}) => {
  const [display, setDisplay] = useState(eventState.display);
  const [selectedRound, setSelectedRound] = useState<WithId<Round> | null>(
    eventState.round || null
  );
  const [selectedMember, setSelectedMember] = useState<WithId<Member> | null>(
    eventState.member || null
  );
  const { enqueueSnackbar } = useSnackbar();

  const handleDisplayChange = (event: SelectChangeEvent<string>) => {
    const newDisplay = event.target.value as AudienceDisplayScreen;
    setDisplay(newDisplay);
    setSelectedRound(null);
    setSelectedMember(null);
  };
  const handleSend = () => {
    const payload: Record<string, any> = { display };
    if (display === 'round') payload.round = selectedRound;
    if (display === 'member') payload.member = selectedMember;
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
            <InputLabel id="round-select-label">סבב</InputLabel>
            <Select
              labelId="round-select-label"
              id="round-select"
              value={selectedRound?._id.toString() || ''}
              label="סבב"
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
      {display === 'member' && (
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="member-select-label">חבר</InputLabel>
            <Select
              labelId="member-select-label"
              id="member-select"
              value={selectedMember?._id.toString() || ''}
              label="חבר"
              onChange={e =>
                setSelectedMember(members.find(m => m._id.toString() === e.target.value) || null)
              }
            >
              {members.map(member => {
                const displayName = member.replacedBy ? member.replacedBy.name : member.name;
                return (
                  <MenuItem key={member._id.toString()} value={member._id.toString()}>
                    {displayName} - {member.city}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </Box>
      )}
      <Box sx={{ mt: 3 }}>
        <Button variant="contained" onClick={handleSend} fullWidth>
          שליחה
        </Button>
      </Box>
    </Paper>
  );
};
