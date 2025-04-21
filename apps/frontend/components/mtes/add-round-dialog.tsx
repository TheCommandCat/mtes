import React, { useMemo, useState } from 'react';
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
import { Formik, Form, FieldArray, getIn, FormikHelpers } from 'formik';
import { z } from 'zod';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { apiFetch } from '../../lib/utils/fetch';
import { WithId } from 'mongodb';
import { Member, Position, Positions } from '@mtes/types'; // Add WithId import

// --- Zod Schemas ---
// Assuming Position is defined elsewhere, e.g.:
// export const Position = ['יו"ר', 'סיו"ר', 'מזכ"ל'] as const;
// type PositionType = typeof Position[number];

// Update the Role schema to use WithId<Member>
const RoleSchema = z.object({
  // Use the imported Position type directly if it's a const array
  role: z.enum(Position, {
    required_error: 'Position is required',
    invalid_type_error: 'Invalid position selected'
  }),
  // Use z.custom<Member>() for better type checking if Member is a known interface/type
  contestants: z
    .array(z.custom<WithId<Member>>(), { required_error: 'Contestants are required' })
    .min(2, 'At least 2 contestants is required'),
  maxVotes: z
    .number({
      required_error: 'Max votes is required',
      invalid_type_error: 'Max votes must be a number' // Added for clarity
    })
    .int() // Ensure it's an integer
    .min(1, 'Must be at least 1')
});

const FormSchema = z.object({
  roundName: z.string().min(1, 'Round name is required'),
  allowedMembers: z
    .array(z.custom<WithId<Member>>())
    .min(1, 'At least one member must be allowed to vote'),
  roles: z
    .array(RoleSchema, { required_error: 'At least one role is required' })
    .min(1, 'At least one role is required')
});

// --- Types ---
type Role = z.infer<typeof RoleSchema>;
type FormValues = z.infer<typeof FormSchema>;

// Define the expected API payload structure
interface AddRoundPayload {
  name: string;
  roles: Role[];
  allowedMembers: WithId<Member>[];
  startTime: null; // Or Date if applicable
  endTime: null; // Or Date if applicable
}

interface AddRoundDialogProps {
  availableMembers: WithId<Member>[];
  onRoundCreated?: () => void;
}

const AddRoundDialog: React.FC<AddRoundDialogProps> = ({ availableMembers, onRoundCreated }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const memberOptions = useMemo(() => availableMembers, [availableMembers]);

  const initialValues: FormValues = {
    roundName: '',
    allowedMembers: [],
    roles: [{ role: '' as Positions, contestants: [], maxVotes: 1 }]
  };

  const handleClose = (isSubmitting: boolean) => {
    if (!isSubmitting) {
      setOpen(false);
      // Consider resetting form state on close if desired, though Formik resets on success
    }
  };

  const handleSubmit = async (
    values: FormValues,
    { setSubmitting, resetForm }: FormikHelpers<FormValues>
  ) => {
    try {
      // Construct payload using validated values
      const payload: AddRoundPayload = {
        name: values.roundName,
        roles: values.roles,
        allowedMembers: values.allowedMembers,
        startTime: null, // Explicitly set as per original logic
        endTime: null // Explicitly set as per original logic
      };

      const res = await apiFetch('/api/events/addRound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round: payload }) // Assuming backend expects { round: ... }
      });

      if (!res.ok) {
        // Attempt to parse error message, provide fallback
        let errorMsg = 'Failed to create round';
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch (e) {
          // Ignore if response is not JSON or doesn't have message
        }
        throw new Error(errorMsg);
      }

      enqueueSnackbar('Round created successfully!', { variant: 'success' });
      resetForm();
      setOpen(false); // Close dialog on success
      onRoundCreated?.();
    } catch (error: any) {
      enqueueSnackbar(error.message || 'An unknown error occurred', {
        variant: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setOpen(true)}
        startIcon={<AddIcon />}
      >
        Add New Round
      </Button>
      <Dialog
        open={open}
        onClose={() => handleClose(false)} // Pass isSubmitting status later if needed
        fullWidth
        maxWidth="md"
        // disableEscapeKeyDown is handled by Formik's isSubmitting check in onClose/buttons
      >
        <Formik
          initialValues={initialValues}
          // Use the adapter for validation
          validationSchema={toFormikValidationSchema(FormSchema)}
          onSubmit={handleSubmit}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            setFieldValue,
            isSubmitting,
            submitCount
          }) => (
            // Form tag needs to be inside Formik context consumer
            <Form>
              <DialogTitle>Create New Election Round</DialogTitle>
              <DialogContent>
                <Box sx={{ mt: 1 }}>
                  {/* Round Name */}
                  <TextField
                    fullWidth
                    label="Round Name"
                    name="roundName"
                    value={values.roundName}
                    onChange={handleChange}
                    error={Boolean(
                      (getIn(touched, 'roundName') || submitCount > 0) && getIn(errors, 'roundName')
                    )}
                    helperText={
                      (getIn(touched, 'roundName') || submitCount > 0) && getIn(errors, 'roundName')
                    }
                    disabled={isSubmitting}
                    sx={{ mb: 2 }}
                  />

                  {/* Allowed Members */}
                  <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                    Allowed Voting Members
                  </Typography>
                  <Autocomplete
                    multiple
                    options={memberOptions}
                    getOptionLabel={m => `${m.name} (${m.city})`}
                    isOptionEqualToValue={(option, value) => option._id === value._id} // Important for object comparison
                    value={values.allowedMembers}
                    onChange={(_, v) => setFieldValue('allowedMembers', v)}
                    renderInput={params => (
                      <TextField
                        {...params}
                        label="Select Allowed Members"
                        error={Boolean(
                          (getIn(touched, 'allowedMembers') || submitCount > 0) &&
                            getIn(errors, 'allowedMembers')
                        )}
                        helperText={
                          (getIn(touched, 'allowedMembers') || submitCount > 0) &&
                          getIn(errors, 'allowedMembers') // Zod adapter might return string error here
                        }
                        disabled={isSubmitting}
                      />
                    )}
                    disabled={isSubmitting}
                    sx={{ mb: 3 }}
                  />

                  {/* Roles Section */}
                  <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
                    Roles & Contestants
                  </Typography>
                  <FieldArray name="roles">
                    {arrayHelpers => (
                      <>
                        <List dense>
                          {values.roles.map((role: Role, idx: number) => {
                            const prefix = `roles.${idx}`;
                            const roleTouched = getIn(touched, prefix);
                            const roleErrors = getIn(errors, prefix);
                            const showRoleErrors = roleTouched || submitCount > 0;

                            return (
                              <ListItem
                                key={idx}
                                sx={{
                                  display: 'block',
                                  border: '1px solid #eee',
                                  borderRadius: 1,
                                  p: 2,
                                  mb: 2
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 1
                                  }}
                                >
                                  <Typography variant="subtitle1">Role {idx + 1}</Typography>
                                  {values.roles.length > 1 && (
                                    <IconButton
                                      size="small"
                                      onClick={() => arrayHelpers.remove(idx)}
                                      disabled={isSubmitting}
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  )}
                                </Box>
                                <Grid container spacing={2}>
                                  {/* Position Select */}
                                  <Grid item xs={12} sm={4}>
                                    <FormControl
                                      fullWidth
                                      error={Boolean(showRoleErrors && roleErrors?.role)}
                                    >
                                      <InputLabel>Position</InputLabel>
                                      <Select
                                        name={`${prefix}.role`}
                                        value={role.role}
                                        label="Position"
                                        onChange={handleChange}
                                        disabled={isSubmitting}
                                        displayEmpty
                                      >
                                        {Position.map(p => (
                                          <MenuItem key={p} value={p}>
                                            {p}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                      <FormHelperText>
                                        {showRoleErrors && roleErrors?.role}
                                      </FormHelperText>
                                    </FormControl>
                                  </Grid>

                                  {/* Contestants Autocomplete */}
                                  <Grid item xs={12} sm={8}>
                                    <Autocomplete
                                      multiple
                                      options={memberOptions}
                                      getOptionLabel={m => `${m.name} (${m.city})`}
                                      isOptionEqualToValue={(option, value) =>
                                        option._id === value._id
                                      } // Important
                                      value={role.contestants}
                                      onChange={(_, v) => setFieldValue(`${prefix}.contestants`, v)}
                                      renderInput={params => (
                                        <TextField
                                          {...params}
                                          label="Select Contestants"
                                          error={Boolean(showRoleErrors && roleErrors?.contestants)}
                                          helperText={showRoleErrors && roleErrors?.contestants}
                                          disabled={isSubmitting}
                                        />
                                      )}
                                      disabled={isSubmitting}
                                    />
                                  </Grid>

                                  {/* Max Votes Input */}
                                  <Grid item xs={12} sm={4}>
                                    <TextField
                                      fullWidth
                                      label="Max Votes per Voter"
                                      type="number"
                                      name={`${prefix}.maxVotes`}
                                      value={role.maxVotes}
                                      // Ensure value is treated as number for validation
                                      onChange={e => {
                                        const value = e.target.value;
                                        setFieldValue(
                                          `${prefix}.maxVotes`,
                                          value === '' ? '' : Number(value)
                                        );
                                      }}
                                      error={Boolean(showRoleErrors && roleErrors?.maxVotes)}
                                      helperText={showRoleErrors && roleErrors?.maxVotes}
                                      disabled={isSubmitting}
                                      inputProps={{ min: 1 }}
                                    />
                                  </Grid>
                                </Grid>
                              </ListItem>
                            );
                          })}
                        </List>

                        <Button
                          onClick={() =>
                            arrayHelpers.push({
                              role: '' as Positions,
                              contestants: [],
                              maxVotes: 1
                            })
                          }
                          startIcon={<AddIcon />}
                          disabled={isSubmitting}
                        >
                          Add Role
                        </Button>
                        {/* Display top-level roles array error (e.g., "At least one role required") */}
                        {(getIn(touched, 'roles') || submitCount > 0) &&
                          typeof errors.roles === 'string' && (
                            <FormHelperText error>{errors.roles}</FormHelperText>
                          )}
                      </>
                    )}
                  </FieldArray>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => handleClose(isSubmitting)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Round'}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </>
  );
};

export default AddRoundDialog;
