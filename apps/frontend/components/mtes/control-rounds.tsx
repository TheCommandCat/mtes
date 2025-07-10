import { Member, Round } from '@mtes/types';
import { Box, Typography, Grid, Card, CardContent, Chip, IconButton, Stack } from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import PollIcon from '@mui/icons-material/Poll';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
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

const handleDeleteRound = (round: WithId<Round>, refreshData: () => void) => {
  if (!confirm(`האם אתה בטוח שברצונך למחוק את הסבב "${round.name}"?`)) {
    return;
  }

  console.log('Deleting round:', round);
  apiFetch(`/api/events/rounds/delete`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId: round._id })
  }).then(() => {
    enqueueSnackbar(`הסבב ${round.name} נמחק`, { variant: 'success' });
    refreshData();
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
          const hasNotStarted = !round.startTime; // Round hasn't started if startTime is null
          const canEdit = hasNotStarted && !isLocked; // Can only edit rounds that haven't started and aren't locked

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
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {round.roles.map((role, idx) => (
                        <Chip
                          key={`${role.role}-${idx}`}
                          label={role.role}
                          variant="filled"
                          sx={{
                            fontSize: '0.9rem',
                            padding: '8px 12px',
                            height: 'auto',
                            borderRadius: '16px',
                            fontWeight: 'bold'
                          }}
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

                    {/* Edit button - only show for rounds that haven't started yet */}
                    {canEdit && (
                      <AddRoundDialog
                        availableMembers={members}
                        onRoundCreated={refreshData}
                        initialRound={round}
                        isEdit={true}
                        // If AddRoundDialog needs a custom trigger, add a prop like below
                        // triggerIcon={<EditIcon fontSize="small" />}
                      />
                    )}

                    {/* Duplicate button - always show for any round */}
                    <AddRoundDialog
                      availableMembers={members}
                      onRoundCreated={refreshData}
                      initialRound={round}
                      isDuplicate={true}
                      // If AddRoundDialog needs a custom trigger, add a prop like below
                      // triggerIcon={<ContentCopyIcon fontSize="small" />}
                    />

                    <IconButton
                      size="small"
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteRound(round, refreshData);
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
