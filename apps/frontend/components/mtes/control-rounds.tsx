import { Round } from '@mtes/types';
import { Box, Typography, ListItem, Button, ListItemText, Divider } from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import SendIcon from '@mui/icons-material/Send';
import { WithId } from 'mongodb';
import { apiFetch } from 'apps/frontend/lib/utils/fetch';
import router from 'next/router';

interface ControlRoundsProps {
  rounds: WithId<Round>[];
  setSelectedRound: (round: WithId<Round> | null) => void;
}

const handleDeleteRound = (round: WithId<Round>) => {
  console.log('Deleting round:', round);
  apiFetch(`/api/events/deleteRound`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId: round._id })
  }).then(() => {
    enqueueSnackbar(`הסבב ${round.name} נמחק`, { variant: 'success' });
    router.reload();
  });
};

export const ControlRounds = ({ rounds, setSelectedRound }: ControlRoundsProps) => {
  return (
    <Box sx={{ mt: 2, textAlign: 'center' }}>
      <Typography variant="subtitle1" gutterBottom>
        ניהול סבבים
      </Typography>
      {rounds.map(round => (
        <Box key={round.name}>
          <ListItem sx={{ display: 'flex', flexDirection: 'row-reverse' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setSelectedRound(round);
                enqueueSnackbar(`בחרת את הסבב ${round.name}`, { variant: 'info' });
              }}
              startIcon={<SendIcon />}
              sx={{ ml: 2, direction: 'ltr' }}
            >
              טען
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                handleDeleteRound(round);
              }}
              sx={{ ml: 2, direction: 'ltr' }}
            >
              מחק
            </Button>
            <ListItemText
              primary={round.name}
              secondary={`${round.roles.map(role => role.role).join(', ') || 'ללא תפקידים'}`}
              sx={{ textAlign: 'right' }}
            />
          </ListItem>
          <Divider />
        </Box>
      ))}
    </Box>
  );
};
