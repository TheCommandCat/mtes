import { Round } from '@mtes/types';
import { Box, Typography, ListItem, Button, ListItemText, Divider } from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import SendIcon from '@mui/icons-material/Send';

interface ControlRoundsProps {
  rounds: Round[];
  setSelectedRound: (round: Round | null) => void;
  activeRound: Round | null;
}

export const ControlRounds = ({ rounds, setSelectedRound, activeRound }: ControlRoundsProps) => {
  return (
    <Box sx={{ mt: 2, textAlign: 'center' }}>
      <Typography variant="subtitle1" gutterBottom>
        ניהול סבבים
      </Typography>
      {rounds.map(round => (
        <Box key={round.name}>
          <ListItem sx={{ display: 'flex', flexDirection: 'row-reverse' }}>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              onClick={() => {
                setSelectedRound(round);
                enqueueSnackbar(`בחרת את הסבב ${round.name}`, { variant: 'info' });
              }}
              startIcon={<SendIcon />}
              sx={{ ml: 2, direction: 'ltr' }}
              disabled={activeRound !== null}
            >
              שלח
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
