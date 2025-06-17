import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  useTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import BadgeIcon from '@mui/icons-material/Badge';
import BallotIcon from '@mui/icons-material/Ballot';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import { Member, Position, Round } from '@mtes/types';
import { FieldArray, FieldArrayRenderProps, Form, Formik, FormikHelpers, getIn } from 'formik';
import { useSnackbar } from 'notistack';
import React, { useMemo, useState } from 'react';
import { z } from 'zod';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { apiFetch } from '../../lib/utils/fetch';
import { WithId } from 'mongodb';
const RoleSchema = z.object({
  role: z
    .string({
      required_error: 'Position is required',
      invalid_type_error: 'Invalid position selected'
    })
    .min(1, 'Position is required'),
  contestants: z
    .array(z.string(), { required_error: 'Contestants are required' })
    .min(2, 'At least 2 contestants is required'),
  maxVotes: z
    .number({
      required_error: 'Max votes is required',
      invalid_type_error: 'Max votes must be a number'
    })
    .int()
    .min(1, 'Must be at least 1'),
  whiteVote: z.boolean().default(false)
});

const FormSchema = z.object({
  roundName: z.string().min(1, 'Round name is required'),
  allowedMembers: z.array(z.string()).min(1, 'At least one member must be allowed to vote'),
  roles: z
    .array(RoleSchema, { required_error: 'At least one role is required' })
    .min(1, 'At least one role is required')
});

type RoleFormValues = z.infer<typeof RoleSchema> & { _tempClientId: string };
type FormValues = Omit<z.infer<typeof FormSchema>, 'roles'> & {
  roles: RoleFormValues[];
};

interface ApiRound {
  name: string;
  allowedMembers: string[];
  roles: {
    role: string;
    contestants: string[];
    maxVotes: number;
    whiteVote: boolean;
  }[];
  startTime: Date | null;
  endTime: Date | null;
  isLocked: boolean;
}

interface AddRoundDialogProps {
  availableMembers: WithId<Member>[];
  onRoundCreated?: () => void;
  initialRound?: WithId<Round>;
  isEdit?: boolean;
}

const createNewRole = (
  existingData?: Partial<z.infer<typeof RoleSchema>> & { contestants?: string[] }
): RoleFormValues => ({
  _tempClientId: `role_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  role: existingData?.role || '',
  contestants: existingData?.contestants || [],
  maxVotes: existingData?.maxVotes ?? 1,
  whiteVote: existingData?.whiteVote ?? false
});

const CustomStepIcon = (props: {
  active?: boolean;
  completed?: boolean;
  icon: React.ReactNode;
}) => {
  const { active, completed, icon: stepNumber } = props;
  const theme = useTheme();
  const icons: { [key: number]: React.ReactElement } = {
    1: <SettingsIcon sx={{ fontSize: '1.5rem' }} />,
    2: <GroupAddIcon sx={{ fontSize: '1.5rem' }} />
  };
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: '50%',
        backgroundColor: active
          ? theme.palette.primary.main
          : completed
          ? theme.palette.success.main
          : theme.palette.grey[300],
        color: active || completed ? theme.palette.common.white : theme.palette.grey[600],
        transition: 'background-color 0.3s, color 0.3s, transform 0.2s',
        transform: active ? 'scale(1.1)' : 'scale(1)',
        boxShadow: active ? theme.shadows[2] : 'none'
      }}
    >
      {completed ? (
        <CheckCircleIcon sx={{ fontSize: '1.6rem' }} />
      ) : (
        icons[stepNumber as number] || stepNumber
      )}
    </Box>
  );
};

const AddRoundDialog: React.FC<AddRoundDialogProps> = ({
  availableMembers,
  onRoundCreated,
  initialRound,
  isEdit = false
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const memberOptions = useMemo(() => availableMembers, [availableMembers]);
  const [activeStep, setActiveStep] = useState(0);
  const theme = useTheme();

  const steps = ['פרטי הסבב', 'הגדרת תפקידים'];

  const initialValues: FormValues = useMemo(() => {
    if (isEdit && initialRound) {
      return {
        roundName: initialRound.name,
        allowedMembers: initialRound.allowedMembers.map(member => member._id.toString()),
        roles: initialRound.roles.map(role =>
          createNewRole({
            ...role,
            contestants: role.contestants.map(c =>
              typeof c === 'string' ? c : (c as WithId<Member>)._id.toString()
            )
          })
        )
      };
    }
    return {
      roundName: '',
      allowedMembers: availableMembers.map(member => member._id.toString()),
      roles: [createNewRole()]
    };
  }, [isEdit, initialRound, availableMembers]);

  const handleClose = (isSubmitting: boolean) => {
    if (!isSubmitting) {
      setOpen(false);
      setActiveStep(0);
    }
  };

  const handleSubmit = async (
    values: FormValues,
    { setSubmitting, resetForm }: FormikHelpers<FormValues>
  ) => {
    const rolesForApi = values.roles.map(({ _tempClientId, ...restOfRole }) => restOfRole);

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
            maxVotes: r.maxVotes,
            whiteVote: r.whiteVote
          }))
          .sort((a, b) => a.role.localeCompare(b.role));
        const currentComparableRoles = rolesForApi
          .map(r => ({
            ...r,
            contestants: [...r.contestants].sort()
          }))
          .sort((a, b) => a.role.localeCompare(b.role));
        if (JSON.stringify(currentComparableRoles) !== JSON.stringify(initialComparableRoles)) {
          changes.roles = rolesForApi;
        }

        if (Object.keys(changes).length > 0) {
          const res = await apiFetch('/api/events/rounds/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roundId: initialRound._id,
              round: changes
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
        const payload: ApiRound = {
          name: values.roundName,
          roles: rolesForApi,
          allowedMembers: values.allowedMembers,
          startTime: null,
          endTime: null,
          isLocked: false
        };
        const res = await apiFetch('/api/events/rounds/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ round: payload })
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to create round');
        }
        enqueueSnackbar('Round created successfully!', { variant: 'success' });
        const newInitialValues = {
          roundName: '',
          allowedMembers: availableMembers.map(member => member._id.toString()),
          roles: [createNewRole()]
        };
        resetForm({ values: newInitialValues });
        setActiveStep(0);
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

  const handleNext = () => {
    setActiveStep(prevActiveStep => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep(prevActiveStep => prevActiveStep - 1);
  };

  return (
    <>
      {isEdit ? (
        <IconButton size="small" onClick={() => setOpen(true)} title="Edit Round">
          <EditIcon fontSize="small" />
        </IconButton>
      ) : (
        <IconButton
          size="large"
          onClick={() => setOpen(true)}
          sx={{
            backgroundColor: 'primary.main',
            color: 'white',
            transition:
              'transform 0.2s ease-in-out, background-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: 'primary.dark',
              transform: 'scale(1.15) rotate(5deg)',
              boxShadow: theme.shadows[6]
            },
            '&:active': {
              transform: 'scale(0.9) rotate(0deg)'
            },
            boxShadow: theme.shadows[4],
            p: 1.5
          }}
          title="Add New Round"
        >
          <AddIcon sx={{ fontSize: '1.75rem' }} />
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
        maxWidth="lg"
        PaperProps={{ sx: { borderRadius: 4, height: '85%' } }}
        sx={{ '& .MuiDialog-container': { alignItems: 'center' } }}
      >
        <Formik
          initialValues={initialValues}
          validationSchema={toFormikValidationSchema(FormSchema)}
          onSubmit={handleSubmit}
          enableReinitialize
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
            <Form style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <DialogTitle
                sx={{
                  backgroundColor: 'primary.dark',
                  color: 'common.white',
                  borderTopLeftRadius: theme.shape.borderRadius * 3.5,
                  borderTopRightRadius: theme.shape.borderRadius * 3.5,
                  py: 2.5,
                  px: 3.5,
                  fontSize: '1.6rem',
                  mb: 0
                }}
              >
                {isEdit ? 'עריכת סבב בחירות' : 'יצירת סבב בחירות חדש'}
              </DialogTitle>

              <DialogContent
                sx={{
                  mt: 2,
                  px: { xs: 3, sm: 4, md: 5 },
                  flexGrow: 1,
                  overflowY: 'hidden'
                }}
              >
                <Stepper activeStep={activeStep} alternativeLabel sx={{ mt: 1 }}>
                  {steps.map(label => (
                    <Step key={label}>
                      <StepLabel StepIconComponent={CustomStepIcon}>
                        <Typography variant="h6" component="span">
                          {label}
                        </Typography>
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: 'calc(100% - 100px)',
                    overflowY: 'auto',
                    pr: 1
                  }}
                >
                  {activeStep === 0 && (
                    <Stack spacing={5} sx={{ pt: 1, pb: 2, minWidth: '60%' }}>
                      <TextField
                        fullWidth
                        label="שם הסבב"
                        name="roundName"
                        value={values.roundName}
                        onChange={handleChange}
                        error={Boolean(
                          (getIn(touched, 'roundName') || submitCount > 0) &&
                            getIn(errors, 'roundName')
                        )}
                        helperText={
                          (getIn(touched, 'roundName') || submitCount > 0) &&
                          getIn(errors, 'roundName')
                        }
                        disabled={isSubmitting}
                        variant="outlined"
                        InputProps={{ sx: { borderRadius: 2, fontSize: '1.1rem' } }}
                        InputLabelProps={{ sx: { fontSize: '1.1rem' } }}
                      />
                      <Autocomplete
                        multiple
                        options={memberOptions}
                        getOptionLabel={m => `${m.name} (${m.city})`}
                        isOptionEqualToValue={(option, value) =>
                          option._id.toString() === value._id.toString()
                        }
                        value={memberOptions.filter(opt =>
                          values.allowedMembers.includes(opt._id.toString())
                        )}
                        onChange={(_, selectedOptions) =>
                          setFieldValue(
                            'allowedMembers',
                            selectedOptions.map(opt => opt._id.toString())
                          )
                        }
                        renderInput={params => (
                          <TextField
                            {...params}
                            variant="outlined"
                            label="בחר חברים מורשים להצביע"
                            error={Boolean(
                              (getIn(touched, 'allowedMembers') || submitCount > 0) &&
                                getIn(errors, 'allowedMembers')
                            )}
                            helperText={
                              (getIn(touched, 'allowedMembers') || submitCount > 0) &&
                              getIn(errors, 'allowedMembers')
                            }
                            disabled={isSubmitting}
                            InputProps={{
                              ...params.InputProps,
                              sx: { borderRadius: 2, fontSize: '1.1rem', height: 'auto' } // Changed height to 'auto'
                            }}
                            InputLabelProps={{ sx: { fontSize: '1.1rem' } }}
                          />
                        )}
                        disabled={isSubmitting}
                        ChipProps={{
                          sx: {
                            backgroundColor: 'secondary.light',
                            color: 'secondary.contrastText',
                            borderRadius: 1.5,
                            p: 0.75,
                            height: 'auto',
                            fontSize: '0.9rem'
                          }
                        }}
                      />
                    </Stack>
                  )}

                  {activeStep === 1 && (
                    <Stack spacing={5} sx={{ pt: 1, pb: 2 }}>
                      <FieldArray name="roles">
                        {(arrayHelpers: FieldArrayRenderProps) => (
                          <>
                            <Box
                              sx={{
                                overflowY: 'auto',
                                pr: 1.5,
                                mr: -1.5
                              }}
                            >
                              <Stack spacing={4} sx={{ p: 1 }}>
                                {values.roles.map((role, idx) => {
                                  const prefix = `roles.${idx}`;
                                  const roleTouched = getIn(touched, prefix);
                                  const roleErrors = getIn(errors, prefix);
                                  const showRoleErrors =
                                    Object.keys(roleTouched || {}).length > 0 || submitCount > 0;

                                  return (
                                    <Card
                                      key={role._tempClientId}
                                      variant="elevation"
                                      elevation={4}
                                      sx={{
                                        borderRadius: 3,
                                        transition: 'all 0.3s ease-in-out',
                                        '&:hover': {
                                          transform: 'translateY(-5px) scale(1.01)'
                                        },
                                        overflow: 'hidden'
                                      }}
                                    >
                                      <CardHeader
                                        avatar={
                                          <Avatar
                                            sx={{
                                              bgcolor: theme.palette.primary.light,
                                              color: theme.palette.primary.contrastText,
                                              width: 48,
                                              height: 48,
                                              mr: 1
                                            }}
                                          >
                                            <BallotIcon sx={{ fontSize: '1.8rem' }} />
                                          </Avatar>
                                        }
                                        title={
                                          <Typography
                                            variant="h5"
                                            component="div"
                                            sx={{ fontWeight: 'medium' }}
                                          >
                                            {`תפקיד ${idx + 1}${role.role ? `: ${role.role}` : ''}`}
                                          </Typography>
                                        }
                                        action={
                                          values.roles.length > 1 && (
                                            <IconButton
                                              size="medium"
                                              onClick={() => arrayHelpers.remove(idx)}
                                              disabled={isSubmitting}
                                              title="Remove Role"
                                              sx={{
                                                color: 'error.dark',
                                                '&:hover': {
                                                  backgroundColor: theme.palette.error.light,
                                                  transform: 'scale(1.1)'
                                                },
                                                mr: 1
                                              }}
                                            >
                                              <DeleteIcon fontSize="medium" />
                                            </IconButton>
                                          )
                                        }
                                        sx={{
                                          backgroundColor: 'grey.100',
                                          py: 2,
                                          px: 3
                                        }}
                                      />
                                      <Divider />
                                      <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
                                        <Grid container spacing={3.5}>
                                          <Grid item xs={12} md={5}>
                                            <Autocomplete
                                              freeSolo
                                              options={Position}
                                              getOptionLabel={option => option}
                                              value={role.role}
                                              onChange={(_, newValue) => {
                                                setFieldValue(`${prefix}.role`, newValue ?? '');
                                              }}
                                              onInputChange={(_, newInputValue) => {
                                                setFieldValue(`${prefix}.role`, newInputValue);
                                              }}
                                              renderInput={params => (
                                                <TextField
                                                  {...params}
                                                  label="תפקיד"
                                                  variant="outlined"
                                                  error={Boolean(
                                                    showRoleErrors && getIn(roleErrors, 'role')
                                                  )}
                                                  helperText={
                                                    showRoleErrors && getIn(roleErrors, 'role')
                                                  }
                                                  disabled={isSubmitting}
                                                  InputProps={{
                                                    ...params.InputProps,
                                                    startAdornment: (
                                                      <InputAdornment position="start">
                                                        <BadgeIcon />
                                                      </InputAdornment>
                                                    )
                                                  }}
                                                />
                                              )}
                                            />
                                          </Grid>

                                          <Grid item xs={12} md={7}>
                                            <TextField
                                              fullWidth
                                              label="מספר הצבעות מקסימלי"
                                              type="number"
                                              name={`${prefix}.maxVotes`}
                                              value={role.maxVotes}
                                              onChange={e => {
                                                const val = e.target.value;
                                                setFieldValue(
                                                  `${prefix}.maxVotes`,
                                                  val === '' ? '' : Number(val)
                                                );
                                              }}
                                              error={Boolean(
                                                showRoleErrors && getIn(roleErrors, 'maxVotes')
                                              )}
                                              helperText={
                                                showRoleErrors && getIn(roleErrors, 'maxVotes')
                                              }
                                              disabled={isSubmitting}
                                              inputProps={{ min: 1 }}
                                              variant="outlined"
                                              sx={{ borderRadius: 2 }}
                                              InputProps={{
                                                startAdornment: (
                                                  <HowToVoteIcon
                                                    sx={{
                                                      mr: 1.5,
                                                      color: 'action.active'
                                                    }}
                                                  />
                                                )
                                              }}
                                            />
                                          </Grid>

                                          <Grid item xs={12}>
                                            <Divider sx={{ my: 2.5 }}>
                                              <Chip
                                                icon={<PeopleAltIcon sx={{ ml: 0.5 }} />}
                                                label="בחירת מתמודדים"
                                                sx={{
                                                  fontSize: '1.05rem',
                                                  p: 1.25,
                                                  height: 'auto',
                                                  borderRadius: '16px'
                                                }}
                                              />
                                            </Divider>
                                            <Autocomplete
                                              multiple
                                              options={memberOptions}
                                              getOptionLabel={m => `${m.name} (${m.city})`}
                                              isOptionEqualToValue={(option, value) =>
                                                option._id.toString() === value._id.toString()
                                              }
                                              value={memberOptions.filter(opt =>
                                                role.contestants.includes(opt._id.toString())
                                              )}
                                              onChange={(_, selectedOptions) =>
                                                setFieldValue(
                                                  `${prefix}.contestants`,
                                                  selectedOptions.map(opt => opt._id.toString())
                                                )
                                              }
                                              renderInput={params => (
                                                <TextField
                                                  {...params}
                                                  variant="outlined"
                                                  label="הוסף מתמודדים לתפקיד זה"
                                                  placeholder="חפש והוסף חברים..."
                                                  error={Boolean(
                                                    showRoleErrors &&
                                                      getIn(roleErrors, 'contestants')
                                                  )}
                                                  helperText={
                                                    showRoleErrors &&
                                                    getIn(roleErrors, 'contestants')
                                                  }
                                                  disabled={isSubmitting}
                                                  InputProps={{
                                                    ...params.InputProps,
                                                    sx: { borderRadius: 2 }
                                                  }}
                                                />
                                              )}
                                              disabled={isSubmitting}
                                              ChipProps={{
                                                sx: {
                                                  backgroundColor: 'primary.light',
                                                  color: 'primary.contrastText',
                                                  borderRadius: 1.5,
                                                  p: 0.75,
                                                  height: 'auto',
                                                  fontSize: '0.9rem'
                                                }
                                              }}
                                              sx={{ mt: 1.5 }}
                                            />
                                          </Grid>

                                          <Grid item xs={12} sx={{ mt: 1.5 }}>
                                            <FormControlLabel
                                              control={
                                                <Checkbox
                                                  name={`${prefix}.whiteVote`}
                                                  checked={role.whiteVote}
                                                  onChange={handleChange}
                                                  disabled={isSubmitting}
                                                  color="secondary"
                                                  sx={{ p: 1.5, mr: 0.5 }}
                                                />
                                              }
                                              label={
                                                <Typography variant="body1">
                                                  אפשר הצבעת "פתק לבן" (אופציונלי)
                                                </Typography>
                                              }
                                              disabled={isSubmitting}
                                            />
                                          </Grid>
                                        </Grid>
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                              </Stack>
                            </Box>
                            <Button
                              onClick={() => arrayHelpers.push(createNewRole())}
                              startIcon={<AddCircleOutlineIcon sx={{ mr: 0.5 }} />}
                              disabled={isSubmitting}
                              variant="contained"
                              color="secondary"
                              sx={{
                                mt: 2.5,
                                alignSelf: 'center',
                                py: 1.5,
                                px: 3.5,
                                fontSize: '1.05rem',
                                borderRadius: 2.5,
                                boxShadow: theme.shadows[3],
                                '&:hover': {
                                  boxShadow: theme.shadows[5],
                                  transform: 'scale(1.03)'
                                }
                              }}
                            >
                              הוסף תפקיד חדש
                            </Button>
                            {(getIn(touched, 'roles') || submitCount > 0) &&
                              typeof errors.roles === 'string' && (
                                <FormHelperText
                                  error
                                  sx={{
                                    mt: 1.5,
                                    textAlign: 'center',
                                    fontSize: '0.9rem'
                                  }}
                                >
                                  {errors.roles}
                                </FormHelperText>
                              )}
                          </>
                        )}
                      </FieldArray>
                    </Stack>
                  )}
                </Box>
              </DialogContent>

              <Divider sx={{ mt: 'auto' }} />
              <DialogActions
                sx={{
                  p: { xs: 2, sm: 3 },
                  backgroundColor: 'grey.100',
                  borderBottomLeftRadius: theme.shape.borderRadius * 3.5,
                  borderBottomRightRadius: theme.shape.borderRadius * 3.5
                }}
              >
                <Button
                  onClick={() => handleClose(isSubmitting)}
                  disabled={isSubmitting}
                  color="inherit"
                  variant="text"
                  sx={{ borderRadius: 2, fontSize: '0.95rem', mr: 1 }}
                >
                  ביטול
                </Button>
                <Box sx={{ flexGrow: 1 }} />
                {activeStep > 0 && (
                  <Button
                    onClick={handleBack}
                    disabled={isSubmitting}
                    variant="outlined"
                    sx={{ borderRadius: 2, fontSize: '0.95rem', mr: 1.5 }}
                  >
                    הקודם
                  </Button>
                )}
                {activeStep < steps.length - 1 && (
                  <Button
                    onClick={handleNext}
                    variant="contained"
                    disabled={isSubmitting}
                    sx={{
                      borderRadius: 2,
                      px: 3.5,
                      py: 1.25,
                      fontSize: '0.95rem'
                    }}
                  >
                    הבא
                  </Button>
                )}
                {activeStep === steps.length - 1 && (
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={isSubmitting}
                    sx={{
                      minWidth: 160,
                      borderRadius: 2,
                      px: 3.5,
                      py: 1.25,
                      fontSize: '1rem',
                      boxShadow: theme.shadows[2],
                      '&:hover': { boxShadow: theme.shadows[4] }
                    }}
                  >
                    {isEdit
                      ? isSubmitting
                        ? 'מעדכן...'
                        : 'עדכן סבב'
                      : isSubmitting
                      ? 'יוצר...'
                      : 'צור סבב'}
                  </Button>
                )}
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </>
  );
};

export default AddRoundDialog;
