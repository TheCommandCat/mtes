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
import { Member, Position, Positions, Round } from '@mtes/types';
import EditIcon from '@mui/icons-material/Edit';

// --- Zod Schemas ---
const RoleSchema = z.object({
  role: z.enum(Position, {
    required_error: 'Position is required',
    invalid_type_error: 'Invalid position selected'
  }),
  contestants: z
    .array(z.string(), { required_error: 'Contestants are required' }) // Store as array of IDs
    .min(2, 'At least 2 contestants is required'),
  maxVotes: z
    .number({
      required_error: 'Max votes is required',
      invalid_type_error: 'Max votes must be a number'
    })
    .int()
    .min(1, 'Must be at least 1')
});

const FormSchema = z.object({
  roundName: z.string().min(1, 'Round name is required'),
  allowedMembers: z
    .array(z.string()) // Store as array of IDs
    .min(1, 'At least one member must be allowed to vote'),
  roles: z
    .array(RoleSchema, { required_error: 'At least one role is required' })
    .min(1, 'At least one role is required')
});

// --- Types ---
type RoleFormValues = z.infer<typeof RoleSchema>; // Contestants will be string[]
type FormValues = z.infer<typeof FormSchema>; // allowedMembers will be string[], roles will use RoleFormValues

// Interface for the payload sent to/received from API if it expects IDs
interface ApiRound {
  name: string;
  allowedMembers: string[];
  roles: {
    role: Positions;
    contestants: string[];
    maxVotes: number;
  }[];
  startTime: Date | null;
  endTime: Date | null;
  isLocked: boolean;
}

interface AddRoundDialogProps {
  availableMembers: WithId<Member>[];
  onRoundCreated?: () => void;
  initialRound?: WithId<Round>; // Assumes initialRound still provides full Member objects
  isEdit?: boolean;
}

const AddRoundDialog: React.FC<AddRoundDialogProps> = ({
  availableMembers,
  onRoundCreated,
  initialRound,
  isEdit = false
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const memberOptions = useMemo(() => availableMembers, [availableMembers]);

  const initialValues: FormValues = useMemo(() => {
    if (isEdit && initialRound) {
      return {
        roundName: initialRound.name,
        allowedMembers: initialRound.allowedMembers.map(member => member._id.toString()),
        roles: initialRound.roles.map(role => ({
          role: role.role,
          // Ensure contestants are mapped to string IDs
          contestants: role.contestants.map(c =>
            typeof c === 'string' ? c : (c as WithId<Member>)._id.toString()
          ),
          maxVotes: role.maxVotes
        }))
      };
    }
    return {
      roundName: '',
      allowedMembers: availableMembers.map(member => member._id.toString()), // Default to all available member IDs as strings
      roles: [
        {
          role: Position[0], // Default to the first position or handle as empty
          contestants: [],
          maxVotes: 1
        }
      ]
    };
  }, [isEdit, initialRound, availableMembers]);

  const handleClose = (isSubmitting: boolean) => {
    if (!isSubmitting) {
      setOpen(false);
    }
  };

  const handleSubmit = async (
    values: FormValues,
    { setSubmitting, resetForm }: FormikHelpers<FormValues>
  ) => {
    try {
      if (isEdit && initialRound) {
        const changes: Partial<ApiRound> = {};

        if (values.roundName !== initialRound.name) {
          changes.name = values.roundName;
        }

        const initialAllowedMemberIds = initialRound.allowedMembers
          .map(m => m._id.toString())
          .sort();
        const currentAllowedMemberIds = [...values.allowedMembers].sort();
        if (JSON.stringify(currentAllowedMemberIds) !== JSON.stringify(initialAllowedMemberIds)) {
          changes.allowedMembers = values.allowedMembers;
        }

        const initialComparableRoles = initialRound.roles
          .map(r => ({
            role: r.role,
            contestants: r.contestants
              .map(c => (typeof c === 'string' ? c : (c as WithId<Member>)._id.toString()))
              .sort(),
            maxVotes: r.maxVotes
          }))
          .sort((a, b) => a.role.localeCompare(b.role)); // Sort for consistent comparison

        const currentComparableRoles = values.roles
          .map(r => ({
            ...r,
            contestants: [...r.contestants].sort()
          }))
          .sort((a, b) => a.role.localeCompare(b.role)); // Sort for consistent comparison

        if (JSON.stringify(currentComparableRoles) !== JSON.stringify(initialComparableRoles)) {
          changes.roles = values.roles;
        }

        if (Object.keys(changes).length > 0) {
          const res = await apiFetch('/api/events/updateRound', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roundId: initialRound._id,
              round: changes // Send only changed fields, now with IDs
            })
          });
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to update round');
          }
          enqueueSnackbar('Round updated successfully!', { variant: 'success' });
        } else {
          enqueueSnackbar('No changes detected.', { variant: 'info' });
        }
      } else {
        // Creating new round, payload expects IDs
        const payload: ApiRound = {
          name: values.roundName,
          roles: values.roles, // roles.contestants are already string[]
          allowedMembers: values.allowedMembers, // already string[]
          startTime: null,
          endTime: null,
          isLocked: false
        };

        const res = await apiFetch('/api/events/addRound', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ round: payload })
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to create round');
        }
        enqueueSnackbar('Round created successfully!', { variant: 'success' });
        resetForm();
      }

      setOpen(false);
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
      {isEdit ? (
        <IconButton size="small" onClick={() => setOpen(true)}>
          <EditIcon fontSize="small" />
        </IconButton>
      ) : (
        <IconButton
          size="small"
          onClick={() => setOpen(true)}
          sx={{
            backgroundColor: 'primary.main',
            color: 'white',
            transition: 'transform 0.2s, background-color 0.2s',
            '&:hover': {
              backgroundColor: 'primary.dark',
              transform: 'scale(1.1)'
            },
            '&:active': { transform: 'scale(0.95)' }
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      )}

      <Dialog
        open={open}
        onClose={(_, reason) => {
          if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') {
            handleClose(false);
          }
        }}
        fullWidth
        maxWidth="md"
      >
        <Formik
          initialValues={initialValues}
          validationSchema={toFormikValidationSchema(FormSchema)}
          onSubmit={handleSubmit}
          enableReinitialize // Important if initialValues can change due to props
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
            <Form>
              <DialogTitle>{isEdit ? 'עריכת סבב בחירות' : 'יצירת סבב בחירות חדש'}</DialogTitle>
              <DialogContent>
                <Box sx={{ mt: 1 }}>
                  <TextField
                    fullWidth
                    label="שם הסבב"
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

                  <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                    חברי הצבעה מורשים
                  </Typography>
                  <Autocomplete
                    multiple
                    options={memberOptions}
                    getOptionLabel={m => `${m.name} (${m.city})`}
                    isOptionEqualToValue={(option, value) =>
                      option._id.toString() === value._id.toString()
                    }
                    value={
                      memberOptions.filter(opt =>
                        values.allowedMembers.includes(opt._id.toString())
                      ) // Map IDs back to member objects for Autocomplete value
                    }
                    onChange={(_, selectedOptions) =>
                      setFieldValue(
                        'allowedMembers',
                        selectedOptions.map(opt => opt._id.toString()) // Store string IDs in Formik
                      )
                    }
                    renderInput={params => (
                      <TextField
                        {...params}
                        label="בחר חברים מורשים"
                        error={Boolean(
                          (getIn(touched, 'allowedMembers') || submitCount > 0) &&
                            getIn(errors, 'allowedMembers')
                        )}
                        helperText={
                          (getIn(touched, 'allowedMembers') || submitCount > 0) &&
                          getIn(errors, 'allowedMembers')
                        }
                        disabled={isSubmitting}
                      />
                    )}
                    disabled={isSubmitting}
                    sx={{ mb: 3 }}
                  />

                  <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
                    תפקידים ומתמודדים
                  </Typography>
                  <FieldArray name="roles">
                    {arrayHelpers => (
                      <>
                        <List dense>
                          {values.roles.map((role: RoleFormValues, idx: number) => {
                            const prefix = `roles.${idx}`;
                            const roleTouched = getIn(touched, prefix);
                            const roleErrors = getIn(errors, prefix);
                            const showRoleErrors =
                              Object.keys(roleTouched || {}).length > 0 || submitCount > 0;

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
                                  <Typography variant="subtitle1">תפקיד {idx + 1}</Typography>
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
                                  <Grid item xs={12} sm={4}>
                                    <FormControl
                                      fullWidth
                                      error={Boolean(showRoleErrors && roleErrors?.role)}
                                    >
                                      <InputLabel>תפקיד</InputLabel>
                                      <Select
                                        name={`${prefix}.role`}
                                        value={role.role}
                                        label="תפקיד"
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

                                  <Grid item xs={12} sm={8}>
                                    <Autocomplete
                                      multiple
                                      options={memberOptions}
                                      getOptionLabel={m => `${m.name} (${m.city})`}
                                      isOptionEqualToValue={(option, value) =>
                                        option._id.toString() === value._id.toString()
                                      }
                                      value={
                                        memberOptions.filter(opt =>
                                          role.contestants.includes(opt._id.toString())
                                        ) // Map IDs to objects
                                      }
                                      onChange={(_, selectedOptions) =>
                                        setFieldValue(
                                          `${prefix}.contestants`,
                                          selectedOptions.map(opt => opt._id.toString()) // Store string IDs
                                        )
                                      }
                                      renderInput={params => (
                                        <TextField
                                          {...params}
                                          label="בחר מתמודדים"
                                          error={Boolean(showRoleErrors && roleErrors?.contestants)}
                                          helperText={showRoleErrors && roleErrors?.contestants}
                                          disabled={isSubmitting}
                                        />
                                      )}
                                      disabled={isSubmitting}
                                    />
                                  </Grid>

                                  <Grid item xs={12} sm={4}>
                                    <TextField
                                      fullWidth
                                      label="מספר הצבעות מקסימלי למצביע"
                                      type="number"
                                      name={`${prefix}.maxVotes`}
                                      value={role.maxVotes}
                                      onChange={e => {
                                        const val = e.target.value;
                                        setFieldValue(
                                          `${prefix}.maxVotes`,
                                          val === '' ? '' : Number(val) // Keep as '' if empty for Zod to catch type, or Number
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
                              role: Position[0], // Default to first position
                              contestants: [],
                              maxVotes: 1
                            })
                          }
                          startIcon={<AddIcon />}
                          disabled={isSubmitting}
                        >
                          הוסף תפקיד
                        </Button>
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
                  ביטול
                </Button>
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                  {isEdit
                    ? isSubmitting
                      ? 'מעדכן...'
                      : 'עדכן סבב'
                    : isSubmitting
                    ? 'יוצר...'
                    : 'צור סבב'}
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
