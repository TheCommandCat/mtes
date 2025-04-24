import { Round } from '@mtes/types';
import { Box, Typography, ListItem, Button, ListItemText, Divider, Chip } from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import SendIcon from '@mui/icons-material/Send';
import LockIcon from '@mui/icons-material/Lock';
import { WithId } from 'mongodb';
import { apiFetch } from 'apps/frontend/lib/utils/fetch';
import router from 'next/router';

interface ControlRoundsProps {
  rounds: WithId<Round>[];
  setSelectedRound: (round: WithId<Round> | null) => void;
  handleShowResults: (round: WithId<Round>) => void;
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

export const ControlRounds = ({
  rounds,
  setSelectedRound,
  handleShowResults
}: ControlRoundsProps) => {
  return (
    <Box sx={{ mt: 2, textAlign: 'center' }}>
      <Typography variant="subtitle1" gutterBottom>
        ניהול סבבים
      </Typography>
      {rounds.map(round => (
        <Box key={round.name}>
          <ListItem
            sx={{
              display: 'flex',
              flexDirection: 'row-reverse',
              bgcolor: round.isLocked ? 'rgba(0, 0, 0, 0.04)' : 'transparent'
            }}
          >
            {!round.isLocked ? (
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
            ) : (
              <Button
                variant="outlined"
                color="info"
                onClick={() => handleShowResults(round)}
                startIcon={<LockIcon />}
                sx={{ ml: 2, direction: 'ltr' }}
              >
                הצג תוצאות
              </Button>
            )}
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
              primary={
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}
                >
                  <Typography>{round.name}</Typography>
                  {round.isLocked && (
                    <Chip
                      size="small"
                      icon={<LockIcon sx={{ fontSize: '0.8rem' }} />}
                      label="נעול"
                      color="default"
                      variant="outlined"
                    />
                  )}
                </Box>
              }
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
