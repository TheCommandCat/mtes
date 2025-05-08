import { Member, Round } from '@mtes/types';
import { Box, Typography, Grid, Card, CardContent, Chip, IconButton, Stack } from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import PollIcon from '@mui/icons-material/Poll';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { WithId } from 'mongodb';
import { apiFetch } from 'apps/frontend/lib/utils/fetch';
import router from 'next/router';
import AddRoundDialog from './add-round-dialog';

interface ControlRoundsProps {
  rounds: WithId<Round>[];
  setSelectedRound: (round: WithId<Round> | null) => void;
  handleShowResults: (round: WithId<Round>) => void;
  members: WithId<Member>[];
  refreshData: () => void;
}

const handleDeleteRound = (round: WithId<Round>) => {
  if (!confirm(`האם אתה בטוח שברצונך למחוק את הסבב "${round.name}"?`)) {
    return;
  }

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
  handleShowResults,
  members,
  refreshData
}: ControlRoundsProps) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          סבבים זמינים
        </Typography>
        <AddRoundDialog availableMembers={members} onRoundCreated={refreshData} />
      </Box>
      <Grid container spacing={2}>
        {rounds.map(round => {
          const isLocked = round.isLocked;

          return (
            <Grid item xs={12} key={round._id.toString()}>
              <Card
                sx={{
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  bgcolor: 'background.paper',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 3
                  },
                  borderLeft: isLocked ? 4 : 0,
                  borderLeftColor: 'warning.main'
                }}
              >
                <CardContent
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    py: '12px !important'
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      {isLocked ? (
                        <LockIcon color="warning" fontSize="small" />
                      ) : (
                        <LockOpenIcon color="success" fontSize="small" />
                      )}
                      <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                        {round.name}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {round.roles.map(role => (
                        <Chip
                          key={role.role}
                          label={role.role}
                          size="small"
                          variant="outlined"
                          sx={{ height: 24 }}
                        />
                      ))}
                    </Box>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ ml: 2 }}>
                    {isLocked ? (
                      <IconButton
                        size="small"
                        onClick={() => handleShowResults(round)}
                        sx={{
                          color: 'info.main',
                          bgcolor: 'info.50',
                          '&:hover': {
                            bgcolor: 'info.100'
                          }
                        }}
                      >
                        <PollIcon fontSize="small" />
                      </IconButton>
                    ) : (
                      <IconButton
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedRound(round);
                          enqueueSnackbar(`בחרת את הסבב ${round.name}`, { variant: 'info' });
                        }}
                        sx={{
                          color: 'primary.main',
                          bgcolor: 'primary.50',
                          '&:hover': {
                            bgcolor: 'primary.100'
                          }
                        }}
                      >
                        <PlayArrowIcon fontSize="small" />
                      </IconButton>
                    )}

                    <IconButton
                      size="small"
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteRound(round);
                      }}
                      sx={{
                        color: 'error.main',
                        bgcolor: 'error.50',
                        '&:hover': {
                          bgcolor: 'error.100'
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};
