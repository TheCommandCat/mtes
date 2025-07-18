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
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
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
const RoleSchema = z
  .object({
    role: z
      .string({
        required_error: 'יש להזין תפקיד',
        invalid_type_error: 'תפקיד לא תקין'
      })
      .min(1, 'יש להזין תפקיד'),
    contestants: z
      .array(z.string(), { required_error: 'יש להוסיף מתמודדים' })
      .min(1, 'יש להוסיף לפחות מתמודד אחד'),
    maxVotes: z
      .number({
        required_error: 'יש להזין מספר קולות מקסימלי',
        invalid_type_error: 'מספר הקולות חייב להיות מספר'
      })
      .int()
      .min(1, 'חייב להיות לפחות 1'),
    numWhiteVotes: z
      .number({
        required_error: 'יש להזין מספר קולות פתק לבן',
        invalid_type_error: 'מספר קולות פתק לבן חייב להיות מספר'
      })
      .int()
      .min(0, 'חייב להיות לפחות 0'),
    numWinners: z
      .number({
        required_error: 'יש להזין מספר זוכים',
        invalid_type_error: 'מספר הזוכים חייב להיות מספר'
      })
      .int()
      .min(1, 'חייב להיות לפחות זוכה 1')
  })
  .refine(
    data => {
      if (data.contestants.length === 1) {
        return data.numWhiteVotes > 0;
      }
      return true;
    },
    {
      message: 'נדרש לפחות קול פתק לבן אחד כאשר יש מתמודד יחיד',
      path: ['numWhiteVotes']
    }
  )
  .refine(
    data => {
      return data.numWinners <= data.contestants.length;
    },
    {
      message: 'מספר הזוכים לא יכול להיות גדול ממספר המתמודדים',
      path: ['numWinners']
    }
  );

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
    numWhiteVotes: number;
    numWinners: number;
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
  isDuplicate?: boolean;
}

const WHITE_VOTE_ID_PREFIX = '000000000000000000000';

const createNewRole = (
  existingData?: Partial<z.infer<typeof RoleSchema>> & { contestants?: string[] }
): RoleFormValues => ({
  _tempClientId: `role_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  role: existingData?.role || '',
  contestants: existingData?.contestants || [],
  maxVotes: existingData?.maxVotes ?? 1,
  numWhiteVotes: existingData?.numWhiteVotes ?? 0,
  numWinners: existingData?.numWinners ?? 1
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
  isEdit = false,
  isDuplicate = false
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const memberOptions = useMemo(() => availableMembers, [availableMembers]);
  const [activeStep, setActiveStep] = useState(0);
  const theme = useTheme();

  const steps = ['פרטי הסבב', 'הגדרת תפקידים'];

  const initialValues: FormValues = useMemo(() => {
    if ((isEdit || isDuplicate) && initialRound) {
      return {
        roundName: isDuplicate ? `${initialRound.name} - העתק` : initialRound.name,
        allowedMembers: initialRound.allowedMembers.map(member => member._id.toString()),
        roles: initialRound.roles.map(role => {
          // Filter out white vote contestants (they have hardcoded IDs starting with WHITE_VOTE_ID_PREFIX)
          const contestants = role.contestants
            .filter(c => {
              // Handle both string IDs and objects with _id property
              let id: string;
              if (typeof c === 'string') {
                id = c;
              } else if (c && typeof c === 'object' && '_id' in c && c._id) {
                id = c._id.toString();
              } else {
                // Skip invalid contestants
                return false;
              }
              // Filter out white vote IDs which start with WHITE_VOTE_ID_PREFIX
              return !id.startsWith(WHITE_VOTE_ID_PREFIX);
            })
            .map(c => {
              if (typeof c === 'string') {
                return c;
              } else if (c && typeof c === 'object' && '_id' in c && c._id) {
                return c._id.toString();
              } else {
                return '';
              }
            })
            .filter(id => id !== ''); // Remove empty strings
          return createNewRole({
            ...role,
            contestants,
            numWhiteVotes:
              contestants.length === 1 && role.numWhiteVotes === 0 ? 1 : role.numWhiteVotes
          });
        })
      };
    }
    return {
      roundName: '',
      allowedMembers: availableMembers.map(member => member._id.toString()),
      roles: [createNewRole()]
    };
  }, [isEdit, isDuplicate, initialRound, availableMembers]);

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
      if (isEdit && !isDuplicate && initialRound) {
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
            numWhiteVotes: r.numWhiteVotes,
            numWinners: r.numWinners
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
            throw new Error(errorData.message || 'נכשל בעדכון הסבב');
          }
          enqueueSnackbar('הסבב עודכן בהצלחה!', { variant: 'success' });
        } else {
          enqueueSnackbar('לא זוהו שינויים.', { variant: 'info' });
        }
      } else {
        // Create new round (for both new rounds and duplicates)
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
          throw new Error(errorData.message || 'נכשל ביצירת הסבב');
        }
        enqueueSnackbar(isDuplicate ? 'הסבב שוכפל בהצלחה!' : 'הסבב נוצר בהצלחה!', {
          variant: 'success'
        });
        if (!isDuplicate) {
          const newInitialValues = {
            roundName: '',
            allowedMembers: availableMembers.map(member => member._id.toString()),
            roles: [createNewRole()]
          };
          resetForm({ values: newInitialValues });
          setActiveStep(0);
        }
      }
      setOpen(false);
      onRoundCreated?.();
    } catch (error: any) {
      enqueueSnackbar(error.message || 'אירעה שגיאה לא צפויה', {
        variant: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      {isEdit ? (
        <IconButton size="small" onClick={() => setOpen(true)} title="Edit Round">
          <EditIcon fontSize="small" />
        </IconButton>
      ) : isDuplicate ? (
        <IconButton size="small" onClick={() => setOpen(true)} title="Duplicate Round">
          <ContentCopyIcon fontSize="small" />
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
        PaperProps={{
          sx: {
            borderRadius: 4,
            maxHeight: '90vh',
            height: 'auto'
          }
        }}
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
            setFieldTouched,
            isSubmitting,
            submitCount
          }) => {
            const handleNext = () => {
              if (activeStep === 0) {
                // Check if roundName is empty
                if (!values.roundName?.trim()) {
                  setFieldTouched('roundName', true);
                  return;
                }
              }
              setActiveStep(prevActiveStep => prevActiveStep + 1);
            };

            const handleBack = () => {
              setActiveStep(prevActiveStep => prevActiveStep - 1);
            };

            return (
              <Form style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <DialogTitle
                  sx={{
                    backgroundColor: 'primary.dark',
                    color: 'common.white',
                    borderTopLeftRadius: theme.shape.borderRadius * 3.5,
                    borderTopRightRadius: theme.shape.borderRadius * 3.5,
                    py: 2.5,
                    px: 3.5,
                    fontSize: '1.6rem'
                  }}
                >
                  {isEdit ? 'עריכת סבב בחירות' : 'יצירת סבב בחירות חדש'}
                </DialogTitle>

                <DialogContent
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    pt: 3,
                    px: { xs: 3, sm: 4, md: 5 },
                    overflowY: 'auto',
                    '&::-webkit-scrollbar': {
                      width: '8px'
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'transparent'
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      borderRadius: '4px'
                    }
                  }}
                >
                  <Stepper activeStep={activeStep} alternativeLabel sx={{ my: 4 }}>
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

                  {activeStep === 0 && (
                    <Stack spacing={5} sx={{ width: '100%', maxWidth: '800px', mx: 'auto' }}>
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
                            label="בחר נציגים מורשים להצביע"
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
                    <Stack spacing={4} sx={{ width: '100%', maxWidth: '1000px', mx: 'auto' }}>
                      <FieldArray name="roles">
                        {(arrayHelpers: FieldArrayRenderProps) => (
                          <Stack spacing={4}>
                            {values.roles.map((role, idx) => {
                              const prefix = `roles.${idx}`;
                              const roleTouched = getIn(touched, prefix);
                              const roleErrors = getIn(errors, prefix);
                              const showRoleErrors =
                                Object.keys(roleTouched || {}).length > 0 || submitCount > 0;
                              const isWhiteVoteInputDisabled = isSubmitting;

                              return (
                                <Card
                                  key={role._tempClientId}
                                  variant="outlined"
                                  sx={{
                                    borderRadius: 3,
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                      transform: 'translateY(-4px)',
                                      boxShadow: theme.shadows[4]
                                    }
                                  }}
                                >
                                  <CardHeader
                                    avatar={
                                      <Avatar
                                        sx={{
                                          bgcolor: 'primary.main',
                                          color: 'primary.contrastText',
                                          width: 48,
                                          height: 48,
                                          boxShadow: 1
                                        }}
                                      >
                                        <BallotIcon sx={{ fontSize: '1.8rem' }} />
                                      </Avatar>
                                    }
                                    title={
                                      <Typography
                                        variant="h5"
                                        component="div"
                                        sx={{
                                          fontWeight: 500,
                                          color: 'text.primary'
                                        }}
                                      >
                                        {`תפקיד ${idx + 1}${role.role ? `: ${role.role}` : ''}`}
                                      </Typography>
                                    }
                                    action={
                                      values.roles.length > 1 ? (
                                        <IconButton
                                          size="medium"
                                          onClick={() => arrayHelpers.remove(idx)}
                                          disabled={isSubmitting}
                                          title="Remove Role"
                                          sx={{
                                            color: 'error.main',
                                            '&:hover': {
                                              backgroundColor: 'error.lighter',
                                              transform: 'scale(1.1)'
                                            }
                                          }}
                                        >
                                          <DeleteIcon fontSize="medium" />
                                        </IconButton>
                                      ) : null
                                    }
                                    sx={{
                                      bgcolor: 'grey.50',
                                      py: 1.5,
                                      px: 2
                                    }}
                                  />
                                  <Divider />
                                  <CardContent sx={{ p: 2 }}>
                                    <Grid container spacing={3}>
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
                                                    <BadgeIcon color="primary" />
                                                  </InputAdornment>
                                                ),
                                                sx: {
                                                  borderRadius: 2,
                                                  backgroundColor: 'background.paper'
                                                }
                                              }}
                                            />
                                          )}
                                        />
                                      </Grid>

                                      <Grid item xs={12} md={4}>
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
                                          InputProps={{
                                            startAdornment: (
                                              <InputAdornment position="start">
                                                <HowToVoteIcon color="primary" />
                                              </InputAdornment>
                                            ),
                                            sx: {
                                              borderRadius: 2,
                                              backgroundColor: 'background.paper'
                                            }
                                          }}
                                        />
                                      </Grid>

                                      <Grid item xs={12} md={4}>
                                        <TextField
                                          fullWidth
                                          label="מספר נבחרים לתפקיד"
                                          type="number"
                                          name={`${prefix}.numWinners`}
                                          value={role.numWinners}
                                          onChange={e => {
                                            const val = e.target.value;
                                            setFieldValue(
                                              `${prefix}.numWinners`,
                                              val === '' ? '' : Number(val)
                                            );
                                          }}
                                          error={Boolean(
                                            showRoleErrors && getIn(roleErrors, 'numWinners')
                                          )}
                                          helperText={
                                            (showRoleErrors && getIn(roleErrors, 'numWinners')) ||
                                            `מקסימום: ${role.contestants.length || 0} מתמודדים`
                                          }
                                          disabled={isSubmitting}
                                          inputProps={{ min: 1, max: role.contestants.length || 1 }}
                                          variant="outlined"
                                          InputProps={{
                                            startAdornment: (
                                              <InputAdornment position="start">
                                                <CheckCircleIcon color="success" />
                                              </InputAdornment>
                                            ),
                                            sx: {
                                              borderRadius: 2,
                                              backgroundColor: 'background.paper'
                                            }
                                          }}
                                        />
                                      </Grid>

                                      <Grid item xs={12} md={4}>
                                        <TextField
                                          fullWidth
                                          label="מספר קולות פתק לבן"
                                          type="text"
                                          inputMode="numeric"
                                          name={`${prefix}.numWhiteVotes`}
                                          value={role.numWhiteVotes}
                                          onChange={e => {
                                            const newVal = e.target.value.replace(/[^0-9]/g, '');
                                            if (newVal === '') {
                                              setFieldValue(`${prefix}.numWhiteVotes`, 0);
                                            } else {
                                              const numVal = parseInt(newVal, 10);
                                              setFieldValue(`${prefix}.numWhiteVotes`, numVal);
                                            }
                                          }}
                                          onFocus={e => e.target.select()}
                                          error={Boolean(
                                            showRoleErrors && getIn(roleErrors, 'numWhiteVotes')
                                          )}
                                          helperText={
                                            (showRoleErrors &&
                                              getIn(roleErrors, 'numWhiteVotes')) ||
                                            (role.contestants.length === 1
                                              ? 'נדרש לפחות קול פתק לבן אחד עבור מועמד בודד'
                                              : 'אם יש יותר ממועמד אחד, ניתן להשאיר 0')
                                          }
                                          disabled={isSubmitting}
                                          inputProps={{
                                            min: 0,
                                            style: { textAlign: 'right' },
                                            pattern: '[0-9]*'
                                          }}
                                          variant="outlined"
                                          InputProps={{
                                            startAdornment: (
                                              <InputAdornment position="start">
                                                <HowToVoteIcon color="secondary" />
                                              </InputAdornment>
                                            ),
                                            sx: {
                                              borderRadius: 2,
                                              backgroundColor: 'background.paper'
                                            }
                                          }}
                                        />
                                      </Grid>

                                      <Grid item xs={12}>
                                        <Divider sx={{ my: 2 }}>
                                          <Chip
                                            icon={<PeopleAltIcon />}
                                            label="בחירת מתמודדים"
                                            color="primary"
                                            sx={{
                                              fontSize: '1rem',
                                              p: 1.5,
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
                                          onChange={(_, selectedOptions) => {
                                            const contestantIds = selectedOptions.map(opt =>
                                              opt._id.toString()
                                            );
                                            setFieldValue(`${prefix}.contestants`, contestantIds);
                                            if (contestantIds.length === 1) {
                                              if (role.numWhiteVotes === 0) {
                                                setFieldValue(`${prefix}.numWhiteVotes`, 1);
                                              }
                                            }
                                            // Adjust numWinners if it exceeds the number of contestants
                                            if (
                                              role.numWinners > contestantIds.length &&
                                              contestantIds.length > 0
                                            ) {
                                              setFieldValue(
                                                `${prefix}.numWinners`,
                                                contestantIds.length
                                              );
                                            }
                                          }}
                                          renderInput={params => (
                                            <TextField
                                              {...params}
                                              variant="outlined"
                                              label="הוסף מתמודדים לתפקיד זה"
                                              placeholder="חפש והוסף נציגים..."
                                              error={Boolean(
                                                showRoleErrors && getIn(roleErrors, 'contestants')
                                              )}
                                              helperText={
                                                showRoleErrors && getIn(roleErrors, 'contestants')
                                              }
                                              disabled={isSubmitting}
                                              InputProps={{
                                                ...params.InputProps,
                                                sx: {
                                                  borderRadius: 2,
                                                  backgroundColor: 'background.paper'
                                                }
                                              }}
                                            />
                                          )}
                                          disabled={isSubmitting}
                                          ChipProps={{
                                            sx: {
                                              backgroundColor: 'primary.lighter',
                                              color: 'primary.dark',
                                              borderRadius: 2,
                                              p: 0.75,
                                              height: 'auto',
                                              fontSize: '0.95rem',
                                              fontWeight: 500,
                                              border: '1px solid',
                                              borderColor: 'primary.light',
                                              '&:hover': {
                                                backgroundColor: 'primary.light',
                                                color: 'primary.contrastText'
                                              }
                                            }
                                          }}
                                        />
                                      </Grid>
                                    </Grid>
                                  </CardContent>
                                </Card>
                              );
                            })}
                            <Button
                              onClick={() => arrayHelpers.push(createNewRole())}
                              startIcon={<AddCircleOutlineIcon />}
                              disabled={isSubmitting}
                              variant="contained"
                              color="secondary"
                              sx={{
                                alignSelf: 'center',
                                py: 1.75,
                                px: 4,
                                fontSize: '1.1rem',
                                borderRadius: 3,
                                boxShadow: theme.shadows[2],
                                transition: 'all 0.2s ease-in-out',
                                '&:hover': {
                                  transform: 'scale(1.05)',
                                  boxShadow: theme.shadows[4]
                                }
                              }}
                            >
                              הוסף תפקיד חדש
                            </Button>
                          </Stack>
                        )}
                      </FieldArray>
                    </Stack>
                  )}
                </DialogContent>

                <DialogActions
                  sx={{
                    p: { xs: 2, sm: 3 },
                    backgroundColor: 'grey.100',
                    borderBottomLeftRadius: theme.shape.borderRadius * 3.5,
                    borderBottomRightRadius: theme.shape.borderRadius * 3.5,
                    borderTop: 1,
                    borderColor: 'divider'
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
                        : isDuplicate
                        ? isSubmitting
                          ? 'משכפל...'
                          : 'שכפל סבב'
                        : isSubmitting
                        ? 'יוצר...'
                        : 'צור סבב'}
                    </Button>
                  )}
                </DialogActions>
              </Form>
            );
          }}
        </Formik>
      </Dialog>
    </>
  );
};

export default AddRoundDialog;
