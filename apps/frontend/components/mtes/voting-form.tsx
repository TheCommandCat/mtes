import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { WithId } from 'mongodb';
import { Member, Round, Positions } from '@mtes/types'; // Assuming Positions is an enum/type
import { Formik, Form, FormikHelpers } from 'formik';
import { enqueueSnackbar } from 'notistack';
import { Socket } from 'socket.io-client';
import { apiFetch } from '../../lib/utils/fetch'; // Adjust path as needed
import { useRef, useState, useMemo } from 'react';
import Signature, { type SignatureRef } from '@uiw/react-signature';

// --- Helper Functions for Formik Field Naming ---

/**
 * Generates a sanitized field name for Formik.
 * Replaces dots in role names with underscores to avoid Formik's path interpretation.
 * @param roleName - The original role name (e.g., "דובר.ת").
 * @param contestantId - The ID of the contestant.
 * @returns A sanitized string suitable for a Formik field name (e.g., "דובר_ת-contestantId").
 */
const generateFormikFieldName = (roleName: string, contestantId: string): string => {
  const sanitizedRoleName = roleName.replace(/\./g, '_');
  return `${sanitizedRoleName}-${contestantId}`;
};

/**
 * Gets the sanitized prefix for a role, used for filtering Formik values.
 * @param roleName - The original role name.
 * @returns A sanitized prefix string (e.g., "דובר_ת-").
 */
const getSanitizedRolePrefix = (roleName: string): string => {
  return `${roleName.replace(/\./g, '_')}-`;
};

// --- Component Interfaces ---

interface VotingFormProps {
  round: WithId<Round>;
  member: WithId<Member>;
  votingStandId: number;
  socket: Socket;
  onVoteComplete: () => void;
}

// Using a Record type for Formik values for better type safety
type FormValues = Record<string, 0 | 1>; // fieldName: 0 or 1

// Errors will be keyed by the original role name for display purposes
interface RoleValidationErrors {
  [originalRoleName: string]: string;
}

export const VotingForm = ({
  round,
  member,
  votingStandId,
  socket,
  onVoteComplete
}: VotingFormProps) => {
  const signatureRef = useRef<SignatureRef>(null);
  const [signaturePoints, setSignaturePoints] = useState<Record<number, number[][]>>({});

  // Memoize initialValues to prevent re-computation on every render unless round changes
  const initialValues: FormValues = useMemo(() => {
    const values: FormValues = {};
    round.roles.forEach(roleConfig => {
      roleConfig.contestants.forEach(contestant => {
        const fieldName = generateFormikFieldName(roleConfig.role, contestant._id.toString());
        values[fieldName] = 0; // 0 = not selected
      });
    });
    return values;
  }, [round]);

  const validateForm = (values: FormValues): RoleValidationErrors => {
    const errors: RoleValidationErrors = {};
    round.roles.forEach(roleConfig => {
      const sanitizedPrefix = getSanitizedRolePrefix(roleConfig.role);
      const selectedCount = Object.entries(values).filter(
        ([key, value]) => key.startsWith(sanitizedPrefix) && value === 1
      ).length;

      if (selectedCount !== roleConfig.maxVotes) {
        // Use the original role name as the key for the error message
        errors[
          roleConfig.role
        ] = `יש לבחור ${roleConfig.maxVotes} מתמודדים לתפקיד ${roleConfig.role}`;
      }
    });
    return errors;
  };

  const handleSubmit = async (values: FormValues, formikHelpers: FormikHelpers<FormValues>) => {
    const { setSubmitting, resetForm } = formikHelpers;

    const formattedVotes: Record<Positions | string, string[]> = {};
    round.roles.forEach(roleConfig => {
      const sanitizedPrefix = getSanitizedRolePrefix(roleConfig.role);
      // The key in formattedVotes should be the original role name
      formattedVotes[roleConfig.role] = Object.entries(values)
        .filter(([key, value]) => key.startsWith(sanitizedPrefix) && value === 1)
        .map(([key]) => key.substring(sanitizedPrefix.length)); // Extract contestantId
    });

    const payload = {
      roundId: round._id.toString(),
      memberId: member._id.toString(),
      votes: formattedVotes,
      votingStandId,
      signature: signaturePoints
    };

    try {
      socket.emit('voteSubmitted', member, votingStandId);

      const response = await apiFetch('/api/events/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error((await response.text()) || 'Network response was not ok');
      }

      enqueueSnackbar('ההצבעה נשלחה בהצלחה!', { variant: 'success' });
      socket.emit('voteProcessed', member, votingStandId);
      onVoteComplete();
      resetForm(); // Resets to the memoized initialValues
      signatureRef.current?.clear();
      setSignaturePoints({});
    } catch (error) {
      console.error('Vote submission failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      enqueueSnackbar(`שגיאה בשליחת ההצבעה: ${errorMessage}`, {
        variant: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignaturePoints = (data: number[][]) => {
    if (data.length > 0) {
      setSignaturePoints(prev => ({
        ...prev,
        [Object.keys(prev).length]: data
      }));
    }
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
    setSignaturePoints({});
  };

  return (
    <Formik
      initialValues={initialValues}
      validate={validateForm}
      onSubmit={handleSubmit}
      enableReinitialize // Important if `round` can change and `initialValues` need to update
    >
      {({ setFieldValue, values, errors, touched, isValid, dirty, isSubmitting }) => {
        // Optional: For debugging, uncomment to see values and errors
        // console.log("Formik Values:", JSON.stringify(values));
        // console.log("Formik Errors:", JSON.stringify(errors));

        return (
          <Form>
            {round.roles.map(roleConfig => {
              const sanitizedRolePrefix = getSanitizedRolePrefix(roleConfig.role);
              const selectedCount = Object.entries(values).filter(
                ([key, value]) => key.startsWith(sanitizedRolePrefix) && value === 1
              ).length;

              // Check if any field within this role section has been touched
              const isRoleSectionTouched = Object.keys(touched).some(touchedKey =>
                touchedKey.startsWith(sanitizedRolePrefix)
              );

              return (
                <Box key={roleConfig.role} sx={{ mb: 6 }}>
                  {/* Role Header */}
                  <Box sx={{ mb: 3, textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight="bold" color="primary">
                      {roleConfig.role} {/* Display original role name */}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {roleConfig.maxVotes === 1
                        ? 'בחר מתמודד אחד'
                        : `בחר ${roleConfig.maxVotes} מתמודדים`}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Typography
                        variant="body2"
                        color={
                          selectedCount === roleConfig.maxVotes
                            ? 'success.main'
                            : errors[roleConfig.role] && isRoleSectionTouched // Show error color if error exists and section touched
                            ? 'error.main'
                            : 'info.main'
                        }
                      >
                        {selectedCount} / {roleConfig.maxVotes} נבחרו
                      </Typography>
                      {errors[roleConfig.role] && isRoleSectionTouched && (
                        <Typography variant="caption" color="error.main">
                          {errors[roleConfig.role]}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Contestant Cards */}
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: 2,
                      justifyItems: 'center'
                    }}
                  >
                    {roleConfig.contestants.map(contestant => {
                      const fieldName = generateFormikFieldName(
                        roleConfig.role,
                        contestant._id.toString()
                      );
                      const isSelected = values[fieldName] === 1;
                      const isDisabled = !isSelected && selectedCount >= roleConfig.maxVotes;

                      return (
                        <Card
                          key={contestant._id.toString()} // Use unique ID for React key
                          variant="outlined"
                          sx={{
                            width: '100%',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                            border: isSelected
                              ? '2px solid #2196F3' // Selected border
                              : errors[roleConfig.role] && touched[fieldName]
                              ? '2px solid #D32F2F' // Error border for this specific card if touched
                              : '1px solid rgba(0,0,0,0.12)', // Default border
                            opacity: isDisabled ? 0.6 : 1,
                            userSelect: 'none',
                            '&:hover': {
                              boxShadow: isDisabled ? 'none' : 4 // No shadow for disabled, more for hover
                            }
                          }}
                          onClick={() => {
                            if (isSelected) {
                              setFieldValue(fieldName, 0, true); // Deselect
                            } else if (!isDisabled) {
                              setFieldValue(fieldName, 1, true); // Select
                            }
                            // No action if disabled
                          }}
                        >
                          <CardContent sx={{ textAlign: 'center', p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                              {contestant.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {contestant.city}
                            </Typography>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}

            {/* Signature Section */}
            <Box sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                חתימה
              </Typography>
              <Box
                sx={{
                  border: '1px solid rgba(0,0,0,0.23)',
                  borderRadius: 1,
                  width: '100%',
                  maxWidth: '500px',
                  height: '200px',
                  mx: 'auto',
                  mb: 1
                }}
              >
                <Signature
                  ref={signatureRef}
                  width="100%"
                  height="100%"
                  onPointer={handleSignaturePoints}
                />
              </Box>
              <Button variant="outlined" onClick={clearSignature} sx={{ mb: 2 }}>
                נקה חתימה
              </Button>
            </Box>

            {/* Submit Button */}
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={
                  !isValid || // Formik's validation status
                  !dirty || // No changes made
                  isSubmitting ||
                  Object.keys(signaturePoints).length === 0 // No signature drawn
                }
                sx={{
                  minWidth: 200,
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  fontSize: '1rem',
                  fontWeight: 'medium',
                  textTransform: 'none',
                  ...(isSubmitting && {
                    bgcolor: 'action.disabled', // Visual feedback for submitting state
                    pointerEvents: 'none'
                  })
                }}
              >
                {isSubmitting ? 'שולח...' : 'אישור הצבעה'}
              </Button>
            </Box>
          </Form>
        );
      }}
    </Formik>
  );
};
