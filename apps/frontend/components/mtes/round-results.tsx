import { Box, Typography, Avatar, Paper, Fab } from '@mui/material';
import { PictureAsPdf as PdfIcon, Launch as LaunchIcon } from '@mui/icons-material';
import { WithId } from 'mongodb';
import { Member, Round, VotingStatus } from '@mtes/types';
import { useRouter } from 'next/router';
import { useState } from 'react';

interface RoleResult {
  contestant: WithId<Member>;
  votes: number;
}

interface RoundResultsProps {
  round: WithId<Round>;
  results: Record<string, RoleResult[]>;
  votedMembers: WithId<VotingStatus>[];
  totalMembers: number;
  electionThreshold?: number;
}

const processResults = (results: Record<string, RoleResult[]>): Record<string, RoleResult[]> => {
  const combineAndSort = (roleResults: RoleResult[]): RoleResult[] => {
    const whiteVotes = roleResults.filter(result => result.contestant.name.includes('פתק לבן'));
    const nonWhiteVotes = roleResults.filter(result => !result.contestant.name.includes('פתק לבן'));

    let processedResults = nonWhiteVotes;
    if (whiteVotes.length > 0) {
      const totalWhiteVotes = whiteVotes.reduce((sum, result) => sum + result.votes, 0);
      const combinedWhiteVote: RoleResult = {
        contestant: {
          _id: whiteVotes[0].contestant._id,
          name: 'פתק לבן',
          city: 'אין אמון באף אחד',
          isPresent: true,
          isMM: false
        },
        votes: totalWhiteVotes
      };
      processedResults = [...nonWhiteVotes, combinedWhiteVote];
    }

    return processedResults.sort((a, b) => b.votes - a.votes);
  };

  return Object.fromEntries(
    Object.entries(results).map(([role, roleResults]) => [role, combineAndSort(roleResults)])
  );
};

export const RoundResults = ({
  round,
  results: initialResults,
  votedMembers,
  totalMembers,
  electionThreshold = 50
}: RoundResultsProps) => {
  const results = processResults(initialResults);
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);

      // Get current event info if available
      const eventId = router.query.eventId as string;
      const queryParams = new URLSearchParams({
        roundId: round._id.toString(),
        ...(eventId && { eventId })
      });

      // Open simple export page in new tab - this shows the data as-is for printing
      const exportUrl = `/mtes/export-pdf?${queryParams.toString()}`;
      window.open(exportUrl, '_blank');
    } catch (error) {
      console.error('Error opening export page:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleServerPdf = async () => {
    try {
      setIsExporting(true);

      // Get current event info if available
      const eventId = router.query.eventId as string;
      const queryParams = new URLSearchParams({
        ...(eventId && { eventId })
      });

      // Download PDF directly from server - this generates a PDF file
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3333';
      const downloadUrl = `${apiBaseUrl}/api/events/export/round-results-pdf/${
        round._id
      }?${queryParams.toString()}`;

      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `round-${round._id}-results.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (!round || !results || !votedMembers || totalMembers <= 0) {
    return (
      <Paper
        elevation={3}
        sx={{
          p: 4,
          mb: 4,
          bgcolor: 'background.paper',
          borderRadius: 3
        }}
      >
        <Typography variant="h5" color="text.secondary" align="center">
          אין נתונים להצגה.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={3}
      sx={{
        p: 4,
        mb: 4,
        bgcolor: 'background.paper',
        background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
        borderRadius: 3
      }}
    >
      <Typography
        variant="h4"
        color="primary"
        gutterBottom
        align="center"
        sx={{
          mb: 4,
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        תוצאות ההצבעה
      </Typography>

      {round.roles.map(role => {
        const roleResults = results[role.role] as RoleResult[];

        // Validate that roleResults exists and is an array
        if (!roleResults || !Array.isArray(roleResults) || roleResults.length === 0) {
          return (
            <Box key={role.role} sx={{ mb: 6 }}>
              <Typography
                variant="h5"
                sx={{
                  mb: 3,
                  color: 'text.primary',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  '&::before, &::after': {
                    content: '""',
                    flex: 1,
                    borderBottom: '2px solid',
                    borderImage:
                      'linear-gradient(to right, transparent, primary.main, transparent) 1',
                    mx: 2
                  }
                }}
              >
                {role.role} (אין תוצאות)
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
                אין תוצאות זמינות לתפקיד זה
              </Typography>
            </Box>
          );
        }

        // Sort results by votes in descending order
        const sortedResults = [...roleResults].sort((a, b) => b.votes - a.votes);

        // Count non-white ballot contestants
        const nonWhiteContestants = sortedResults.filter(
          r => !r.contestant.name.includes('פתק לבן')
        );
        const numContestants = nonWhiteContestants.length;

        // Determine threshold based on number of contestants
        const requiredThreshold = numContestants <= 2 ? 66 : 50;
        const thresholdVotersNeeded =
          numContestants <= 2
            ? Math.ceil((66 / 100) * totalMembers) // 66% for 1-2 contestants (rounded up)
            : Math.floor(totalMembers / 2) + 1; // 50% + 1 for 3+ contestants

        const numWinners = role.numWinners || 1;

        // Get ALL candidates that meet the threshold requirement (including white votes)
        const candidatesAboveThreshold = sortedResults.filter(
          r => r.votes >= thresholdVotersNeeded
        );

        // Take top numWinners from those above threshold
        const actualWinners = candidatesAboveThreshold.slice(0, numWinners);

        // Check for draws in winner positions
        const lastWinnerVotes = actualWinners[numWinners - 1]?.votes || 0;
        const candidatesWithLastWinnerVotes = candidatesAboveThreshold.filter(
          r => r.votes === lastWinnerVotes
        );
        const isDrawForLastPosition =
          candidatesWithLastWinnerVotes.length > 1 && lastWinnerVotes > 0;

        // Check if white ballot won (is among the actual winners)
        const whiteVoteWon = actualWinners.some(winner =>
          winner.contestant.name.includes('פתק לבן')
        );

        return (
          <Box key={role.role} sx={{ mb: 6 }}>
            <Typography
              variant="h5"
              sx={{
                mb: 3,
                color: 'text.primary',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                '&::before, &::after': {
                  content: '""',
                  flex: 1,
                  borderBottom: '2px solid',
                  borderImage:
                    'linear-gradient(to right, transparent, primary.main, transparent) 1',
                  mx: 2
                }
              }}
            >
              {role.role} ({numWinners} {numWinners === 1 ? 'נבחר' : 'נבחרים'})
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
              סף נדרש לניצחון: {requiredThreshold}% ({thresholdVotersNeeded} קולות)
            </Typography>
            {whiteVoteWon ? (
              <Typography
                variant="subtitle1"
                color="error.main"
                sx={{ mb: 2, textAlign: 'center', fontWeight: 'medium' }}
              >
                😢 פתק לבן ניצח - אין אמון באף אחד
              </Typography>
            ) : actualWinners.length === 0 ? (
              <Typography
                variant="subtitle1"
                color="error.main"
                sx={{ mb: 2, textAlign: 'center', fontWeight: 'medium' }}
              >
                אף מתמודד לא הגיע לסף הנדרש ({requiredThreshold}%)
              </Typography>
            ) : actualWinners.length < numWinners ? (
              <Typography
                variant="subtitle1"
                color="warning.main"
                sx={{ mb: 2, textAlign: 'center', fontWeight: 'medium' }}
              >
                רק {actualWinners.length} מתוך {numWinners} המועמדים הגיעו לסף הנדרש
              </Typography>
            ) : isDrawForLastPosition ? (
              <Typography
                variant="subtitle1"
                color="warning.main"
                sx={{ mb: 2, textAlign: 'center', fontWeight: 'medium' }}
              >
                תיקו במקום ה-{numWinners}!
              </Typography>
            ) : (
              <Typography
                variant="subtitle1"
                color="success.main"
                sx={{ mb: 2, textAlign: 'center', fontWeight: 'medium' }}
              >
                🎉{' '}
                {actualWinners.filter(w => !w.contestant.name.includes('פתק לבן')).length === 1
                  ? 'יש מנצח!'
                  : `יש ${
                      actualWinners.filter(w => !w.contestant.name.includes('פתק לבן')).length
                    } מנצחים!`}
              </Typography>
            )}
            <Box sx={{ px: 2 }}>
              {roleResults.map((result: RoleResult, index: number) => {
                const resultPosition =
                  sortedResults.findIndex(
                    r => r.contestant._id.toString() === result.contestant._id.toString()
                  ) + 1;
                const isWinner = actualWinners.some(
                  w => w.contestant._id.toString() === result.contestant._id.toString()
                );
                const isPartOfDraw =
                  isDrawForLastPosition &&
                  candidatesWithLastWinnerVotes.some(
                    c => c.contestant._id.toString() === result.contestant._id.toString()
                  );
                const isAboveThreshold = result.votes >= thresholdVotersNeeded;
                const isWhiteVote = result.contestant.name.includes('פתק לבן');

                let bgColor = 'background.default';
                let borderColor = 'divider';
                let scale = 'scale(1)';
                let shadow = 'none';
                let avatarBgColor = 'primary.main';
                let nameFontWeight = 'medium';
                let nameColor = 'text.primary';
                let votesColor = 'primary.main';

                if (isWinner) {
                  bgColor = 'success.soft';
                  borderColor = 'success.main';
                  scale = 'scale(1.02)';
                  shadow = '0 4px 12px rgba(0,0,0,0.1)';
                  avatarBgColor = 'success.main';
                  nameFontWeight = 'bold';
                  nameColor = 'success.dark';
                  votesColor = 'success.dark';
                } else if (isPartOfDraw) {
                  bgColor = 'warning.soft';
                  borderColor = 'warning.main';
                  scale = 'scale(1.01)';
                  shadow = '0 3px 10px rgba(0,0,0,0.08)';
                  avatarBgColor = 'warning.main';
                  nameFontWeight = 'bold';
                  nameColor = 'warning.dark';
                  votesColor = 'warning.dark';
                } else if (isWhiteVote && whiteVoteWon) {
                  bgColor = 'error.soft';
                  borderColor = 'error.main';
                  scale = 'scale(1.02)';
                  shadow = '0 4px 12px rgba(0,0,0,0.1)';
                  avatarBgColor = 'error.main';
                  nameFontWeight = 'bold';
                  nameColor = 'error.dark';
                  votesColor = 'error.dark';
                } else if (!isAboveThreshold && !isWhiteVote && resultPosition <= numWinners) {
                  bgColor = 'error.soft';
                  borderColor = 'error.main';
                  scale = 'scale(1.01)';
                  shadow = '0 3px 10px rgba(0,0,0,0.08)';
                  avatarBgColor = 'error.main';
                  nameFontWeight = 'bold';
                  nameColor = 'error.dark';
                  votesColor = 'error.dark';
                }

                return (
                  <Box
                    key={result.contestant._id.toString()}
                    sx={{
                      mb: 2,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: bgColor,
                      border: '1px solid',
                      borderColor: borderColor,
                      transition: 'all 0.3s ease',
                      transform: scale,
                      boxShadow: shadow,
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        position: 'relative',
                        zIndex: 1
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            bgcolor: isWinner
                              ? 'success.main'
                              : isPartOfDraw
                              ? 'warning.main'
                              : isWhiteVote && whiteVoteWon
                              ? 'error.main'
                              : !isAboveThreshold && !isWhiteVote && resultPosition <= numWinners
                              ? 'error.main'
                              : 'primary.light',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.875rem',
                            fontWeight: 'bold'
                          }}
                        >
                          {resultPosition}
                        </Box>
                        <Avatar
                          sx={{
                            width: 56,
                            height: 56,
                            bgcolor: avatarBgColor,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                        >
                          {result.contestant.name.charAt(0)}
                        </Avatar>
                      </Box>

                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: nameFontWeight,
                              color: nameColor
                            }}
                          >
                            {result.contestant.name}
                          </Typography>
                          {isWinner && (
                            <Typography
                              variant="caption"
                              sx={{
                                bgcolor: 'success.main',
                                color: 'white',
                                px: 1,
                                py: 0.25,
                                borderRadius: 1,
                                fontWeight: 'bold'
                              }}
                            >
                              נבחר
                            </Typography>
                          )}
                          {isWhiteVote && whiteVoteWon && (
                            <Typography
                              variant="caption"
                              sx={{
                                bgcolor: 'error.main',
                                color: 'white',
                                px: 1,
                                py: 0.25,
                                borderRadius: 1,
                                fontWeight: 'bold'
                              }}
                            >
                              ניצח
                            </Typography>
                          )}
                          {!isAboveThreshold && !isWhiteVote && resultPosition <= numWinners && (
                            <Typography
                              variant="caption"
                              sx={{
                                bgcolor: 'error.main',
                                color: 'white',
                                px: 1,
                                py: 0.25,
                                borderRadius: 1,
                                fontWeight: 'bold'
                              }}
                            >
                              לא עבר סף
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {result.contestant.city}
                        </Typography>
                      </Box>

                      <Box sx={{ textAlign: 'right', minWidth: 100 }}>
                        <Typography
                          variant="h5"
                          sx={{
                            fontWeight: 'bold',
                            color: votesColor
                          }}
                        >
                          {result.votes}
                        </Typography>{' '}
                        <Typography variant="caption" color="text.secondary">
                          קולות
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mt: 0.25 }}
                        >
                          ({Math.round((result.votes / totalMembers) * 100)}% מהמליאה)
                        </Typography>
                        {!isWhiteVote && (
                          <Typography
                            variant="caption"
                            color={isAboveThreshold ? 'success.main' : 'error.main'}
                            sx={{ display: 'block', mt: 0.25, fontWeight: 'bold' }}
                          >
                            {isAboveThreshold ? '✓ עבר סף' : '✗ לא עבר סף'}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        );
      })}

      {/* Total votes summary */}
      <Box
        sx={{
          mt: 4,
          pt: 3,
          borderTop: '2px solid',
          borderColor: 'divider',
          textAlign: 'center'
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          סה"כ הצבעות
        </Typography>
        <Typography
          variant="h3"
          color="primary"
          sx={{
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1
          }}
        >
          {votedMembers.length}
          <Typography component="span" variant="h5" color="text.secondary">
            מתוך {totalMembers}
          </Typography>
        </Typography>{' '}
        <Typography
          variant="body1"
          sx={{
            mt: 1,
            color: 'success.main',
            fontWeight: 'medium'
          }}
        >
          {Math.round((votedMembers.length / totalMembers) * 100)}% אחוז מהמליאה הצביעו
        </Typography>
        <Typography
          variant="body2"
          sx={{
            mt: 2,
            color: 'info.main',
            fontWeight: 'medium',
            px: 2,
            py: 1,
            bgcolor: 'info.soft',
            borderRadius: 1,
            display: 'inline-block'
          }}
        >
          סף כשירות משתנה לפי מספר מועמדים: 1-2 מועמדים = 66%, יותר = 50% + 1
        </Typography>
      </Box>

      {/* Export Buttons */}
      <Box
        sx={{
          mt: 3,
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
          direction: 'rtl'
        }}
      >
        <Fab
          variant="extended"
          size="medium"
          color="primary"
          onClick={handleExportPdf}
          disabled={isExporting}
          sx={{
            px: 3,
            py: 1.5,
            borderRadius: 2,
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease',
            direction: 'rtl',
            '&:hover': {
              boxShadow: '0 6px 12px rgba(0,0,0,0.15)'
            }
          }}
        >
          <LaunchIcon sx={{ ml: 1 }} />
          {isExporting ? 'פותח...' : 'פתח דף הדפסה'}
        </Fab>
        <Fab
          variant="extended"
          size="medium"
          color="secondary"
          onClick={handleServerPdf}
          disabled={isExporting}
          sx={{
            px: 3,
            py: 1.5,
            borderRadius: 2,
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease',
            direction: 'rtl',
            '&:hover': {
              boxShadow: '0 6px 12px rgba(0,0,0,0.15)'
            }
          }}
        >
          <PdfIcon sx={{ ml: 1 }} />
          {isExporting ? 'מוריד...' : 'הורד PDF'}
        </Fab>
      </Box>
    </Paper>
  );
};
