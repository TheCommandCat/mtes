import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  GlobalStyles,
  Grid,
  Paper
} from '@mui/material';
import { WithId } from 'mongodb';
import { Member, Round, VotingStatus } from '@mtes/types';
import { SignatureDisplay } from './signature-display'; // Assuming you have a SignatureDisplay component

interface RoleResult {
  contestant: WithId<Member>;
  votes: number;
}

interface VotingStatusWithMember extends WithId<VotingStatus> {
  member: WithId<Member>;
}

interface RoundResultsPdfProps {
  round: WithId<Round>;
  results: Record<string, RoleResult[]>;
  votedMembers: VotingStatusWithMember[];
  totalMembers: number;
  eventName: string;
  eventDate?: string;
}

const processResults = (results: Record<string, RoleResult[]>): Record<string, RoleResult[]> => {
  if (!results || typeof results !== 'object') {
    return {};
  }

  const combineAndSort = (roleResults: RoleResult[]): RoleResult[] => {
    if (!Array.isArray(roleResults) || roleResults.length === 0) {
      return [];
    }

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

export const RoundResultsPdf = ({
  round,
  results: initialResults,
  votedMembers,
  totalMembers,
  eventName,
  eventDate = ''
}: RoundResultsPdfProps) => {
  const results = processResults(initialResults);

  if (!round || !results || !votedMembers || totalMembers <= 0) {
    return (
      <Box sx={{ p: 4, direction: 'rtl' }}>
        <Typography variant="h5" color="text.secondary" align="center">
          ❌ אין נתונים להצגה
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <GlobalStyles
        styles={{
          '@media print': {
            '@page': {
              size: 'A4',
              margin: '0.5cm'
            },
            body: {
              fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif !important',
              fontSize: '10px !important',
              lineHeight: '1.2 !important',
              direction: 'rtl !important'
            },
            '*': {
              '-webkit-print-color-adjust': 'exact',
              'color-adjust': 'exact'
            }
          }
        }}
      />
      <Box
        sx={{
          p: 2,
          direction: 'rtl',
          fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif',
          fontSize: '15px',
          lineHeight: 1.4,
          maxWidth: '100%',
          margin: '0 auto',
          '@media print': {
            p: 1,
            fontSize: '13px',
            lineHeight: 1.3,
            margin: 0,
            maxWidth: 'none'
          }
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 3, pageBreakInside: 'avoid' }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 'bold',
              mb: 1,
              color: '#1565c0',
              fontSize: '26px',
              '@media print': { fontSize: '22px' }
            }}
          >
            🗳️ {eventName}
          </Typography>
          {eventDate && (
            <Typography
              variant="subtitle2"
              sx={{
                mb: 1.5,
                color: '#555',
                fontSize: '15px',
                '@media print': { fontSize: '13px' }
              }}
            >
              📅 {eventDate}
            </Typography>
          )}
          <Typography
            variant="h5"
            sx={{
              fontWeight: 'bold',
              mb: 2,
              color: '#2e7d32',
              fontSize: '18px',
              '@media print': { fontSize: '16px' }
            }}
          >
            📊 תוצאות ההצבעה
          </Typography>
        </Box>

        {/* Voting Summary - Moved to top */}
        <Box
          sx={{
            mb: 4,
            pt: 3,
            pb: 3,
            borderTop: '2px solid #e0e0e0',
            borderBottom: '2px solid #e0e0e0',
            textAlign: 'center',
            pageBreakInside: 'avoid',
            bgcolor: '#fafafa',
            borderRadius: '8px',
            p: 3
          }}
        >
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              fontWeight: 'bold',
              color: '#1565c0',
              fontSize: '17px',
              '@media print': { fontSize: '15px' }
            }}
          >
            📈 סיכום הצבעות
          </Typography>

          <Box
            sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, mb: 2 }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 'bold',
                  color: '#2e7d32',
                  fontSize: '22px',
                  '@media print': { fontSize: '20px' }
                }}
              >
                ✅ {votedMembers.length}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#666',
                  fontSize: '13px',
                  '@media print': { fontSize: '11px' }
                }}
              >
                הצביעו
              </Typography>
            </Box>

            <Typography
              variant="h3"
              sx={{
                color: '#666',
                fontSize: '26px',
                '@media print': { fontSize: '22px' }
              }}
            >
              /
            </Typography>

            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 'bold',
                  color: '#1565c0',
                  fontSize: '22px',
                  '@media print': { fontSize: '20px' }
                }}
              >
                👥 {totalMembers}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#666',
                  fontSize: '13px',
                  '@media print': { fontSize: '11px' }
                }}
              >
                סה"כ נוכחים
              </Typography>
            </Box>
          </Box>

          <Typography
            variant="h5"
            sx={{
              fontWeight: 'bold',
              color: '#ed6c02',
              mb: 1.5,
              fontSize: '18px',
              '@media print': { fontSize: '16px' }
            }}
          >
            📊 {Math.round((votedMembers.length / totalMembers) * 100)}% השתתפות
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: '#666',
              fontStyle: 'italic',
              fontSize: '13px',
              '@media print': { fontSize: '11px' }
            }}
          >
            💡 סף כשירות: 1 מועמד = 66% • 2+ מועמדים = 50% + 1
          </Typography>
        </Box>

        {/* Results by Role */}
        {round.roles?.map((role, roleIndex) => {
          const roleResults = results[role.role] as RoleResult[];

          if (!roleResults || !Array.isArray(roleResults) || roleResults.length === 0) {
            return (
              <Box key={role.role} sx={{ mb: 4 }}>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
                  {role.role} - אין תוצאות
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
          const requiredThreshold = numContestants === 1 ? 66 : 50;
          const thresholdVotersNeeded =
            numContestants === 1
              ? Math.ceil((66 / 100) * votedMembers.length) // 66% for 1 contestant (rounded up)
              : Math.floor(votedMembers.length / 2) + 1; // 50% + 1 for 2+ contestants

          const numWinners = role.numWinners || 1;

          // Get ALL candidates that meet the threshold requirement (including white votes)
          const candidatesAboveThreshold = sortedResults.filter(
            r => r.votes >= thresholdVotersNeeded
          );

          // Take top numWinners from those above threshold
          const actualWinners = candidatesAboveThreshold.slice(0, numWinners);

          return (
            <Box key={role.role} sx={{ mb: 4, pageBreakInside: 'avoid' }}>
              <Typography
                variant="h6"
                sx={{
                  mb: 2,
                  fontWeight: 'bold',
                  textAlign: 'center',
                  color: '#1565c0',
                  fontSize: '18px',
                  '@media print': { fontSize: '16px' }
                }}
              >
                👑 {role.role}
                {numWinners > 1 ? ` (${numWinners} נבחרים)` : ''}
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  mb: 2,
                  textAlign: 'center',
                  color: '#666',
                  fontSize: '14px',
                  '@media print': { fontSize: '12px' }
                }}
              >
                🎯 סף נדרש: {requiredThreshold}% ({thresholdVotersNeeded} קולות)
              </Typography>

              <TableContainer sx={{ border: '1px solid #ddd', borderRadius: '4px' }}>
                <Table
                  size="small"
                  sx={{
                    '& .MuiTableCell-root': {
                      padding: '8px 10px',
                      '@media print': { padding: '6px 8px' }
                    }
                  }}
                >
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                      <TableCell
                        sx={{
                          fontWeight: 'bold',
                          textAlign: 'center',
                          width: '8%',
                          fontSize: '14px',
                          '@media print': { fontSize: '12px' }
                        }}
                      >
                        🏆
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 'bold',
                          width: '32%',
                          fontSize: '14px',
                          '@media print': { fontSize: '12px' }
                        }}
                      >
                        👤 שם המועמד
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 'bold',
                          width: '20%',
                          fontSize: '14px',
                          '@media print': { fontSize: '12px' }
                        }}
                      >
                        🏙️ עיר
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 'bold',
                          textAlign: 'center',
                          width: '12%',
                          fontSize: '14px',
                          '@media print': { fontSize: '12px' }
                        }}
                      >
                        🗳️ קולות
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 'bold',
                          textAlign: 'center',
                          width: '12%',
                          fontSize: '14px',
                          '@media print': { fontSize: '12px' }
                        }}
                      >
                        📊 אחוזים
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 'bold',
                          textAlign: 'center',
                          width: '16%',
                          fontSize: '14px',
                          '@media print': { fontSize: '12px' }
                        }}
                      >
                        ✅ סטטוס
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedResults.map((result: RoleResult, index: number) => {
                      const position = index + 1;
                      const isWinner = actualWinners.some(
                        w => w.contestant._id.toString() === result.contestant._id.toString()
                      );
                      const isAboveThreshold = result.votes >= thresholdVotersNeeded;
                      const isWhiteVote = result.contestant.name.includes('פתק לבן');
                      const percentage = Math.round((result.votes / totalMembers) * 100);

                      // Determine emoji and status
                      let positionEmoji = '';
                      let statusEmoji = '';
                      let statusText = '';

                      if (isWinner) {
                        positionEmoji =
                          position === 1
                            ? '🥇'
                            : position === 2
                            ? '🥈'
                            : position === 3
                            ? '🥉'
                            : '🏆';
                        statusEmoji = '✅';
                        statusText = 'נבחר';
                      } else if (isWhiteVote) {
                        positionEmoji = '⚪';
                        statusEmoji = '📄';
                        statusText = 'פתק לבן';
                      } else if (!isAboveThreshold && position <= numWinners) {
                        positionEmoji = '❌';
                        statusEmoji = '🚫';
                        statusText = 'לא עבר סף';
                      } else {
                        positionEmoji = `#${position}`;
                        statusEmoji = '⏸️';
                        statusText = 'לא נבחר';
                      }

                      return (
                        <TableRow
                          key={result.contestant._id.toString()}
                          sx={{
                            bgcolor: isWinner ? '#e8f5e8' : 'transparent',
                            '&:nth-of-type(even)': {
                              bgcolor: isWinner ? '#e8f5e8' : '#f9f9f9'
                            },
                            '&:hover': {
                              bgcolor: isWinner ? '#dcedc8' : '#f5f5f5'
                            }
                          }}
                        >
                          <TableCell
                            sx={{
                              textAlign: 'center',
                              fontWeight: 'bold',
                              fontSize: '16px',
                              '@media print': { fontSize: '14px' }
                            }}
                          >
                            {positionEmoji}
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: isWinner ? 'bold' : 'normal',
                              fontSize: '14px',
                              '@media print': { fontSize: '12px' }
                            }}
                          >
                            {result.contestant.name}
                          </TableCell>
                          <TableCell
                            sx={{
                              fontSize: '13px',
                              '@media print': { fontSize: '11px' },
                              color: '#666'
                            }}
                          >
                            {result.contestant.city}
                          </TableCell>
                          <TableCell
                            sx={{
                              textAlign: 'center',
                              fontWeight: 'bold',
                              fontSize: '14px',
                              '@media print': { fontSize: '12px' }
                            }}
                          >
                            {result.votes}
                          </TableCell>
                          <TableCell
                            sx={{
                              textAlign: 'center',
                              fontSize: '13px',
                              '@media print': { fontSize: '11px' },
                              color: percentage >= requiredThreshold ? '#2e7d32' : '#666'
                            }}
                          >
                            {percentage}%
                          </TableCell>
                          <TableCell
                            sx={{
                              textAlign: 'center',
                              fontSize: '12px',
                              '@media print': { fontSize: '10px' }
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 0.5
                              }}
                            >
                              <span style={{ fontSize: '14px' }}>{statusEmoji}</span>
                              <span style={{ color: isWinner ? '#2e7d32' : '#666' }}>
                                {statusText}
                              </span>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          );
        })}

        {/* Voters Section with Signatures */}
        <Box sx={{ mt: 4 }}>
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              fontWeight: 'bold',
              textAlign: 'center',
              color: '#1565c0',
              fontSize: '16px',
              '@media print': { fontSize: '14px' }
            }}
          >
            ✍️ רשימת מצביעים וחתימות
          </Typography>

          <Grid container spacing={1}>
            {votedMembers.map((votingStatus, index) => {
              const member = votingStatus.member;
              const signatureData = votingStatus.signature as Record<number, number[][]>;

              return (
                <Grid item xs={12} sm={6} md={4} key={votingStatus._id.toString()}>
                  <Box
                    sx={{
                      p: 1.5,
                      border: '1px solid #ddd',
                      borderRadius: 1,
                      pageBreakInside: 'avoid',
                      mb: 1,
                      backgroundColor: '#fafafa',
                      minHeight: '120px',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, gap: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 'bold',
                          fontSize: '12px',
                          '@media print': { fontSize: '10px' },
                          minWidth: '20px',
                          textAlign: 'center',
                          backgroundColor: '#e3f2fd',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {index + 1}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 'bold',
                          fontSize: '11px',
                          '@media print': { fontSize: '9px' },
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {member?.name || 'לא נמצא'}
                      </Typography>
                    </Box>

                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mb: 1,
                        color: '#666',
                        fontSize: '9px',
                        '@media print': { fontSize: '8px' },
                        lineHeight: 1.2
                      }}
                    >
                      {member?.city || 'לא נמצא'} •{' '}
                      {new Date(votingStatus.votedAt).toLocaleTimeString('he-IL', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>

                    <Box sx={{ flex: 1, minHeight: '60px' }}>
                      <SignatureDisplay
                        signatureData={signatureData}
                        width="100%"
                        height={60}
                        scale={0.5}
                      />
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </Box>
    </>
  );
};
