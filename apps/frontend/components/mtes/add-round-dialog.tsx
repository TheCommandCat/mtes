import React, { useState, useMemo } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  List,
  ListItem,
  IconButton,
  Typography,
  Box,
  Grid,
  Autocomplete,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  FormHelperText
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSnackbar } from 'notistack';
import { apiFetch } from '../../lib/utils/fetch';
import { Member, Positions, Position, Round } from '@mtes/types'; // Import necessary types

// Define RoleConfig locally if not exported or needs adjustment for form state
interface RoleConfigFormState {
  role: Positions | ''; // Allow empty initial state
  contestants: Member[];
  maxVotes: number;
}

// Define the structure for the data sent to the API
interface RoundCreatePayload {
  name: string;
  roles: {
    role: Positions;
    contestants: Member[]; // Send full member objects
    maxVotes: number;
  }[];
  allowedMembers: Member[]; // Send full member objects
  startTime: null;
  endTime: null;
  // eventId?: string; // Add if needed
}

interface AddRoundDialogProps {
  availableMembers: Member[];
  // eventId: string; // Pass eventId if needed for API call
  onRoundCreated?: () => void; // Optional callback after creation
}

const AddRoundDialog: React.FC<AddRoundDialogProps> = ({ availableMembers, onRoundCreated }) => {
  const [open, setOpen] = useState(false);
  const [roundName, setRoundName] = useState('');
  const [roles, setRoles] = useState<RoleConfigFormState[]>([
    { role: '', contestants: [], maxVotes: 1 } // Default maxVotes to 1
  ]);
  const [allowedMembers, setAllowedMembers] = useState<Member[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false); // State to track submission attempt
  const { enqueueSnackbar } = useSnackbar();

  const memberOptions = useMemo(() => availableMembers || [], [availableMembers]);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setOpen(false);
    // Reset form on close
    setRoundName('');
    setRoles([{ role: '', contestants: [], maxVotes: 1 }]);
    setAllowedMembers([]);
    setHasAttemptedSubmit(false); // Reset on close
  };

  // --- Role Management ---
  const handleAddRole = () => {
    setRoles([...roles, { role: '', contestants: [], maxVotes: 1 }]);
  };

  const handleRemoveRole = (index: number) => {
    if (roles.length > 1) {
      const newRoles = roles.filter((_, i) => i !== index);
      setRoles(newRoles);
    } else {
      enqueueSnackbar('At least one role is required.', { variant: 'warning' });
    }
  };

  const handleRoleChange = <K extends keyof RoleConfigFormState>(
    index: number,
    field: K,
    value: RoleConfigFormState[K]
  ) => {
    const newRoles = [...roles];
    newRoles[index][field] = value;
    setRoles(newRoles);
  };
  // --- End Role Management ---

  const handleSubmit = async () => {
    setHasAttemptedSubmit(true); // Mark submission attempt
    setIsSubmitting(true);

    // --- Validation ---
    const isRoundNameValid = roundName.trim() !== '';
    const areAllowedMembersValid = allowedMembers.length > 0;

    let areRolesValid = roles.length > 0; // Start by checking if there's at least one role

    // Validate each role individually
    if (areRolesValid) {
      roles.forEach(role => {
        const isRoleValid = !!role.role;
        const areContestantsValid = role.contestants.length > 0;
        const isMaxVotesValid = typeof role.maxVotes === 'number' && role.maxVotes > 0; // Ensure it's a positive number

        if (!isRoleValid || !areContestantsValid || !isMaxVotesValid) {
          areRolesValid = false; // Mark overall roles as invalid if any single role fails
        }
        // NOTE: Removed the check that contestants must be in allowedMembers
      });
    }

    // Check overall form validity
    const isFormValid = isRoundNameValid && areAllowedMembersValid && areRolesValid;

    if (!isFormValid) {
      enqueueSnackbar('Please fix the errors in the form.', { variant: 'error' });
      setIsSubmitting(false);
      return;
    }
    // --- End Validation ---

    // Construct finalRoles only if the form is valid
    // This ensures types match RoundCreatePayload
    const finalRolesData = roles.map(role => ({
      role: role.role as Positions, // Type assertion is safe here due to prior validation
      contestants: role.contestants,
      maxVotes: role.maxVotes as number // Type assertion is safe here due to prior validation
    }));

    // Proceed with submission if valid
    const roundData: RoundCreatePayload = {
      name: roundName.trim(),
      roles: finalRolesData, // Use the correctly typed data
      allowedMembers: allowedMembers,
      startTime: null,
      endTime: null
      // eventId: eventId // Include if passed and needed
    };

    try {
      // TODO: Confirm API endpoint and if eventId is needed
      // Assuming endpoint '/api/mtes/rounds' or similar based on previous steps
      const response = await apiFetch('/api/events/addRound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round: roundData })
      });

      if (!response.ok) {
        let errorData = { message: 'Failed to create round' };
        try {
          errorData = await response.json();
        } catch (e) {
          /* Ignore if response is not JSON */
        }
        throw new Error(errorData.message || 'Failed to create round');
      }

      enqueueSnackbar('Round created successfully!', { variant: 'success' });
      handleClose();
      onRoundCreated?.(); // Call callback if provided
    } catch (error) {
      console.error('Error creating round:', error);
      enqueueSnackbar(error instanceof Error ? error.message : 'An unknown error occurred', {
        variant: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to get member display name
  const getMemberLabel = (member: Member) => `${member.name} (${member.city})`;

  return (
    <>
      <Button variant="contained" color="primary" onClick={handleClickOpen} startIcon={<AddIcon />}>
        Add New Round
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        disableEscapeKeyDown={isSubmitting}
      >
        <DialogTitle>Create New Election Round</DialogTitle>
        <DialogContent>
          <Box component="form" noValidate autoComplete="off" sx={{ mt: 1 }}>
            {/* Round Name */}
            <TextField
              margin="dense"
              label="Round Name"
              type="text"
              fullWidth
              variant="outlined"
              value={roundName}
              onChange={e => setRoundName(e.target.value)}
              required // Adds asterisk
              disabled={isSubmitting}
              sx={{ mb: 2 }}
              error={hasAttemptedSubmit && !roundName.trim()} // Conditional error
              helperText={hasAttemptedSubmit && !roundName.trim() ? 'Round name is required' : ''} // Conditional helper text
            />

            {/* Allowed Members */}
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
              Allowed Voting Members
            </Typography>
            <Autocomplete
              multiple
              id="allowed-members-autocomplete"
              options={memberOptions}
              getOptionLabel={getMemberLabel}
              value={allowedMembers}
              onChange={(event, newValue) => {
                setAllowedMembers(newValue);
                // Note: We no longer need to filter contestants here as they can be anyone
              }}
              renderInput={params => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="Select Allowed Members"
                  placeholder="Members"
                  // Conditional error (visual only, validation is in handleSubmit)
                  error={hasAttemptedSubmit && allowedMembers.length === 0}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={getMemberLabel(option)}
                    {...getTagProps({ index })}
                  />
                ))
              }
              isOptionEqualToValue={(option, value) =>
                option.name === value.name && option.city === value.city
              } // Adjust comparison if ID exists
              disabled={isSubmitting}
              sx={{ mb: 3 }}
            />
            {/* Conditional helper text */}
            {hasAttemptedSubmit && allowedMembers.length === 0 && (
              <FormHelperText error>At least one member must be allowed to vote.</FormHelperText>
            )}

            {/* Roles Configuration */}
            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
              Roles & Contestants
            </Typography>
            <List dense>
              {roles.map((role, index) => (
                <ListItem
                  key={index}
                  disablePadding
                  sx={{ display: 'block', border: '1px solid #eee', borderRadius: 1, p: 2, mb: 2 }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 1
                    }}
                  >
                    <Typography variant="subtitle1">Role {index + 1}</Typography>
                    {roles.length > 1 && (
                      <IconButton
                        edge="end"
                        aria-label="delete role"
                        onClick={() => handleRemoveRole(index)}
                        disabled={isSubmitting}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>

                  <Grid container spacing={2}>
                    {/* Position Selection */}
                    <Grid item xs={12} sm={4}>
                      {/* Conditional error */}
                      <FormControl
                        fullWidth
                        margin="dense"
                        required
                        error={hasAttemptedSubmit && !role.role}
                      >
                        <InputLabel id={`role-position-label-${index}`}>Position</InputLabel>
                        <Select
                          labelId={`role-position-label-${index}`}
                          value={role.role}
                          label="Position"
                          onChange={e =>
                            handleRoleChange(index, 'role', e.target.value as Positions)
                          }
                          disabled={isSubmitting}
                        >
                          {Position.map((pos: Positions) => (
                            <MenuItem key={pos} value={pos}>
                              {pos}
                            </MenuItem>
                          ))}
                        </Select>
                        {/* Conditional helper text */}
                        {hasAttemptedSubmit && !role.role && (
                          <FormHelperText>Position is required</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>

                    {/* Contestants Selection */}
                    <Grid item xs={12} sm={8}>
                      <Autocomplete
                        multiple
                        id={`role-contestants-autocomplete-${index}`}
                        options={memberOptions} // Use all available members
                        getOptionLabel={getMemberLabel}
                        value={role.contestants}
                        onChange={(event, newValue) => {
                          handleRoleChange(index, 'contestants', newValue);
                        }}
                        renderInput={params => (
                          <TextField
                            {...params}
                            variant="outlined"
                            label="Select Contestants"
                            placeholder="Contestants"
                            margin="dense"
                            // Conditional error
                            error={hasAttemptedSubmit && role.contestants.length === 0}
                            // Conditional helper text
                            helperText={
                              hasAttemptedSubmit && role.contestants.length === 0
                                ? 'At least one contestant required'
                                : ''
                            }
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, tagIndex) => (
                            <Chip
                              variant="outlined"
                              label={getMemberLabel(option)}
                              {...getTagProps({ index: tagIndex })}
                            />
                          ))
                        }
                        isOptionEqualToValue={(option, value) =>
                          option.name === value.name && option.city === value.city
                        }
                        disabled={isSubmitting}
                      />
                    </Grid>

                    {/* Max Votes */}
                    <Grid item xs={12} sm={4}>
                      <TextField
                        margin="dense"
                        label="Max Votes per Voter"
                        type="number"
                        fullWidth
                        variant="outlined"
                        value={role.maxVotes}
                        onChange={e => {
                          const value =
                            e.target.value === '' ? 1 : Math.max(1, parseInt(e.target.value, 10));
                          handleRoleChange(index, 'maxVotes', value);
                        }}
                        required
                        InputProps={{ inputProps: { min: 1 } }}
                        disabled={isSubmitting}
                        // Conditional error
                        error={
                          hasAttemptedSubmit &&
                          (typeof role.maxVotes !== 'number' || role.maxVotes <= 0)
                        }
                        // Conditional helper text
                        helperText={
                          hasAttemptedSubmit &&
                          (typeof role.maxVotes !== 'number' || role.maxVotes <= 0)
                            ? 'Must be > 0'
                            : ''
                        }
                      />
                    </Grid>
                  </Grid>
                </ListItem>
              ))}
            </List>
            <Button
              onClick={handleAddRole}
              startIcon={<AddIcon />}
              disabled={isSubmitting}
              sx={{ mt: 1 }}
            >
              Add Role
            </Button>
            {/* Conditional helper text */}
            {hasAttemptedSubmit && roles.length === 0 && (
              <FormHelperText error sx={{ mt: 1 }}>
                At least one role is required.
              </FormHelperText>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Round'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddRoundDialog;
