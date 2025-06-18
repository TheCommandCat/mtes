import { Box, Typography, Paper, useTheme } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface MemberPresenceStatusProps {
  presentCount: number;
  totalCount: number;
}

export const MemberPresenceStatus = ({ presentCount, totalCount }: MemberPresenceStatusProps) => {
  const theme = useTheme();
  const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
  const isLowPresence = percentage < 66;
  const requiredMembersForQuorum = totalCount > 0 ? Math.ceil(totalCount * 0.66) : 0;

  if (isLowPresence) {
    const membersLeftForQuorum = Math.max(0, requiredMembersForQuorum - presentCount);
    return (
      <Paper
        elevation={2}
        sx={{
          p: { xs: 2, sm: 3 },
          mb: 2,
          backgroundColor: 'rgb(255, 244, 229)', // Keeping custom subtle background
          border: '1px solid rgb(255, 224, 178)', // Keeping custom subtle border
          borderRadius: 2,
          textAlign: 'center'
        }}
      >
        <WarningAmberIcon
          sx={{
            fontSize: { xs: '2.5rem', sm: '3rem' },
            color: theme.palette.warning.main,
            mb: 0.5
          }}
        />
        <Typography
          variant="h5"
          color={theme.palette.warning.dark}
          sx={{ fontWeight: 'bold', mb: 1 }} // Removed gutterBottom, adjusted mb
        >
          נדרשת נוכחות נוספת
        </Typography>
        <Typography
          variant="h1"
          fontWeight="bold"
          color={theme.palette.error.main} // Using error color for critical number
          sx={{ my: 1, lineHeight: 1.1 }}
        >
          {membersLeftForQuorum}
        </Typography>
        <Typography variant="h6" color={theme.palette.warning.dark} sx={{ mb: 2 }}>
          נציגים לנוכחות תקינה (66%)
        </Typography>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'baseline',
            gap: 0.5,
            my: 1.5,
            opacity: 0.85
          }}
        >
          <Typography variant="body1" color="text.secondary">
            נציגים נוכחים:
          </Typography>
          <Typography variant="body1" fontWeight="medium" color={theme.palette.warning.dark}>
            {presentCount} / {totalCount}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            ({percentage}%)
          </Typography>
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1, px: 1, display: 'block' }}
        >
          לקיום בחירות תקינות נדרשת נוכחות של לפחות {requiredMembersForQuorum} מתוך {totalCount}{' '}
          נציגים.
        </Typography>
      </Paper>
    );
  } else {
    const extraMembers = presentCount - requiredMembersForQuorum;

    return (
      <Box
        sx={{
          p: { xs: '6px 12px', sm: '8px 16px' },
          mb: 2,
          backgroundColor: 'rgb(232, 245, 233)', // Reverted to softer green
          border: '1px solid rgb(165, 214, 167)', // Reverted to softer green border
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          textAlign: 'center',
          width: 'fit-content',
          margin: '0 auto 16px auto'
        }}
      >
        <CheckCircleOutlineIcon
          sx={{ fontSize: { xs: '1.1rem', sm: '1.2rem' }, color: 'rgb(46, 125, 50)' }} // Reverted to specific RGB green
        />
        <Typography
          variant="body2"
          color="rgb(46, 125, 50)" // Reverted to specific RGB green
          fontWeight="medium"
          sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}
        >
          נוכחות תקינה:
          <Typography component="span" variant="body2" fontWeight="bold" color="rgb(27, 94, 32)">
            {' '}
            {/* Reverted to specific RGB green */}
            {presentCount}/{totalCount}
          </Typography>
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.25 }}>
            ({percentage}%)
          </Typography>
          {extraMembers > 0 && (
            <Typography
              component="span"
              variant="caption"
              fontWeight="bold"
              color="rgb(27, 94, 32)" // Reverted to specific RGB green
              sx={{ ml: 0.5 }}
            >
              ({extraMembers}+ מעל הנדרש)
            </Typography>
          )}
          {extraMembers === 0 && (
            <Typography
              component="span"
              variant="caption"
              fontWeight="medium"
              color="rgb(27, 94, 32)" // Reverted to specific RGB green
              sx={{ ml: 0.5 }}
            >
              (בדיוק הנדרש)
            </Typography>
          )}
        </Typography>
      </Box>
    );
  }
};
