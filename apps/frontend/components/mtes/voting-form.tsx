import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { WithId } from 'mongodb';
import { Member, Round, Positions } from '@mtes/types';
import { Formik, Form } from 'formik';
import { enqueueSnackbar } from 'notistack';
import { Socket } from 'socket.io-client';
import { apiFetch } from '../../lib/utils/fetch';
import { useRef, useState } from 'react';
import Signature, { type SignatureRef } from '@uiw/react-signature';

interface VotingFormProps {
  round: WithId<Round>;
  member: WithId<Member>;
  votingStandId: number;
  socket: Socket;
  onVoteComplete: () => void;
}

interface RoleErrors {
  [key: string]: string;
}

export const VotingForm = ({
  round,
  member,
  votingStandId,
  socket,
  onVoteComplete
}: VotingFormProps) => {
  const signatureRef = useRef<SignatureRef>(null);
  const [signaturePoints, setSignaturePoints] = useState<Record<number, number[][]>>([]);

  const initialValues = Object.fromEntries(
    round.roles.flatMap(role =>
      role.contestants.map(c => [
        `${role.role}-${c._id}`,
        0 // 0 = not selected, 1 = selected
      ])
    )
  );

  const validateForm = (values: Record<string, number>) => {
    const errors: RoleErrors = {};
    round.roles.forEach(roleConfig => {
      const selectedCount = Object.entries(values).filter(
        ([key, value]) => key.startsWith(roleConfig.role + '-') && value === 1
      ).length;

      if (selectedCount !== roleConfig.maxVotes) {
        errors[
          roleConfig.role
        ] = `יש לבחור ${roleConfig.maxVotes} מתמודדים לתפקיד ${roleConfig.role}`;
      }
    });
    return errors;
  };

  const handleSubmit = async (
    values: Record<string, number>,
    {
      setSubmitting,
      resetForm
    }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void }
  ) => {
    const formattedVotes: Record<Positions | string, string[]> = {};
    round.roles.forEach(roleConfig => {
      formattedVotes[roleConfig.role] = Object.entries(values)
        .filter(([key, value]) => key.startsWith(roleConfig.role + '-') && value === 1)
        .map(([key]) => key.split('-')[1]);
    });

    const payload = {
      roundId: round._id,
      memberId: member._id,
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
      resetForm();
      signatureRef.current?.clear();
      setSignaturePoints([]);
    } catch (error) {
      console.error('Vote submission failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      enqueueSnackbar(`שגיאה בשליחת ההצבעה: ${errorMessage}`, { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePoints = (data: number[][]) => {
    if (data.length > 0) {
      setSignaturePoints(prev => ({
        ...prev,
        [Object.keys(signaturePoints).length]: data
      }));
    }
  };

  return (
    <Formik initialValues={initialValues} validate={validateForm} onSubmit={handleSubmit}>
      {({ setFieldValue, values, errors, touched, isValid, dirty, isSubmitting }) => (
        <Form>
          {round.roles.map(roleConfig => {
            const selectedCount = Object.entries(values).filter(
              ([key, value]) => key.startsWith(roleConfig.role + '-') && value === 1
            ).length;

            return (
              <Box key={roleConfig.role} sx={{ mb: 6 }}>
                <Box sx={{ mb: 3, textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    {roleConfig.role}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {roleConfig.maxVotes === 1
                      ? 'בחר מתמודד אחד'
                      : `בחר ${roleConfig.maxVotes} מתמודדים`}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography
                      variant="body2"
                      color={selectedCount === roleConfig.maxVotes ? 'success.main' : 'info.main'}
                    >
                      {selectedCount} / {roleConfig.maxVotes} נבחרו
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 2,
                    justifyItems: 'center'
                  }}
                >
                  {roleConfig.contestants.map(contestant => {
                    const fieldName = `${roleConfig.role}-${contestant._id}`;
                    const isSelected = values[fieldName] === 1;
                    const isDisabled = !isSelected && selectedCount >= roleConfig.maxVotes;

                    return (
                      <Card
                        key={contestant.name}
                        variant="outlined"
                        sx={{
                          width: '100%',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                          border: isSelected ? '2px solid #2196F3' : '1px solid rgba(0,0,0,0.12)',
                          opacity: isDisabled ? 0.6 : 1,
                          userSelect: 'none',
                          '&:hover': {
                            boxShadow: isDisabled ? 1 : 4
                          }
                        }}
                        onClick={() => {
                          if (isSelected) {
                            setFieldValue(fieldName, 0, true);
                          } else if (!isDisabled) {
                            setFieldValue(fieldName, 1, true);
                          }
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
              <Signature ref={signatureRef} width="100%" height="100%" onPointer={handlePoints} />
            </Box>

            <Button
              variant="outlined"
              onClick={() => {
                signatureRef.current?.clear();
                setSignaturePoints([]);
              }}
              sx={{ mb: 2 }}
            >
              נקה חתימה
            </Button>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={
                !isValid || !dirty || isSubmitting || JSON.stringify(signaturePoints) === '[]'
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
                  bgcolor: 'action.disabled',
                  pointerEvents: 'none'
                })
              }}
            >
              {isSubmitting ? 'שולח...' : 'אישור הצבעה'}
            </Button>
          </Box>
        </Form>
      )}
    </Formik>
  );
};
