import { Box, Typography, Avatar, Paper } from '@mui/material';
import { WithId } from 'mongodb';
import { Member, Round, VotingStatus } from '@mtes/types';

interface RoleResult {
  contestant: WithId<Member>;
  votes: number;
}

interface RoundResultsProps {
  round: WithId<Round>;
  results: Record<string, RoleResult[]>;
  votedMembers: WithId<VotingStatus>[];
  totalMembers: number;
}

export const RoundResults = ({ round, results, votedMembers, totalMembers }: RoundResultsProps) => {
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
        const roleResults = (results[role.role] || []) as RoleResult[];
        if (roleResults.length === 0) {
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
                {role.role}
              </Typography>
              <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 2 }}>
                אין נתונים להצגה עבור תפקיד זה.
              </Typography>
            </Box>
          );
        }

        const maxVotes = Math.max(0, ...roleResults.map((r: RoleResult) => r.votes));
        const potentialWinners = roleResults.filter(r => r.votes === maxVotes && maxVotes > 0);
        const isDrawForRole = potentialWinners.length > 1;

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
              {role.role}
            </Typography>

            {isDrawForRole && (
              <Typography
                variant="subtitle1"
                color="warning.main"
                sx={{ mb: 2, textAlign: 'center', fontWeight: 'medium' }}
              >
                תיקו בין המתמודדים המובילים!
              </Typography>
            )}

            <Box sx={{ px: 2 }}>
              {roleResults.map((result: RoleResult) => {
                const percentage = maxVotes > 0 ? (result.votes / maxVotes) * 100 : 0;
                const isContestantPartOfDraw =
                  isDrawForRole && result.votes === maxVotes && maxVotes > 0;
                const isClearWinner = !isDrawForRole && result.votes === maxVotes && maxVotes > 0;

                let bgColor = 'background.default';
                let borderColor = 'divider';
                let scale = 'scale(1)';
                let shadow = 'none';
                let avatarBgColor = 'primary.main';
                let nameFontWeight = 'medium';
                let nameColor = 'text.primary';
                let votesColor = 'primary.main';
                let progressBarBgColor = 'primary.soft';

                if (isClearWinner) {
                  bgColor = 'success.soft';
                  borderColor = 'success.main';
                  scale = 'scale(1.02)';
                  shadow = '0 4px 12px rgba(0,0,0,0.1)';
                  avatarBgColor = 'success.main';
                  nameFontWeight = 'bold';
                  nameColor = 'success.dark';
                  votesColor = 'success.dark';
                  progressBarBgColor = 'success.soft';
                } else if (isContestantPartOfDraw) {
                  bgColor = 'warning.soft';
                  borderColor = 'warning.main';
                  scale = 'scale(1.01)';
                  shadow = '0 3px 10px rgba(0,0,0,0.08)';
                  avatarBgColor = 'warning.main';
                  nameFontWeight = 'bold';
                  nameColor = 'warning.dark';
                  votesColor = 'warning.dark';
                  progressBarBgColor = 'warning.soft';
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

                      <Box sx={{ flexGrow: 1 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: nameFontWeight,
                            color: nameColor
                          }}
                        >
                          {result.contestant.name}
                        </Typography>
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
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          קולות
                        </Typography>
                        {totalMembers > 0 && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mt: 0.25 }}
                          >
                            ({Math.round((result.votes / totalMembers) * 100)}% מהמליאה)
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Progress bar background */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: `${percentage}%`,
                        bgcolor: progressBarBgColor,
                        opacity: 0.2, // Adjusted opacity for better visibility with warning colors
                        transition: 'width 1s ease-out'
                      }}
                    />
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
        </Typography>
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
      </Box>
    </Paper>
  );
};
