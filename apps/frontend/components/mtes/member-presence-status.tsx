import { Box, Typography, Paper, Chip } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface MemberPresenceStatusProps {
  presentCount: number;
  totalCount: number;
}

export const MemberPresenceStatus = ({ presentCount, totalCount }: MemberPresenceStatusProps) => {
  const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
  const isLowPresence = percentage < 66;
  const missingMembers = totalCount - presentCount;

  if (isLowPresence) {
    return (
      <Paper
        elevation={2}
        sx={{
          p: 2,
          mb: 2,
          background: 'linear-gradient(to right, #fff3e0, #ffcc80)',
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        <Typography variant="h6" color="warning.dark" gutterBottom>
          סטטוס נוכחות
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="h4" fontWeight="bold" color="warning.dark">
            {presentCount}
          </Typography>
          <Typography variant="h5" color="warning.dark">
            /
          </Typography>
          <Typography variant="h4" fontWeight="bold" color="warning.dark">
            {totalCount}
          </Typography>
        </Box>
        <Typography variant="body1" color="warning.dark" sx={{ mb: 0.5 }}>
          {percentage}% מהחברים נוכחים
        </Typography>
        <Typography variant="subtitle2" color="warning.dark" sx={{ mb: 0.5 }}>
          חסרים {missingMembers} חברים לנוכחות תקינה.
        </Typography>
        <Typography variant="subtitle1" color="error.dark" fontWeight="bold">
          לקיום בחירות תקינות נדרשת נוכחות של לפחות 66% מהחברים.
        </Typography>
      </Paper>
    );
  } else {
    const requiredMembersForQuorum = Math.ceil(totalCount * 0.66);
    const extraMembers = presentCount - requiredMembersForQuorum;

    return (
      <Chip
        icon={<CheckCircleOutlineIcon sx={{ fontSize: '1.1rem', color: 'success.dark' }} />}
        label={
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
              נוכחות תקינה:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
              {`${presentCount}/${totalCount}`}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {`(${percentage}%)`}
            </Typography>
            {extraMembers > 0 ? (
              <Typography
                variant="caption"
                sx={{ fontWeight: 'bold', color: 'success.main', ml: 0.25 }}
              >
                {`(+${extraMembers} מעל הנדרש)`}
              </Typography>
            ) : (
              <Typography
                variant="caption"
                sx={{ fontWeight: 'bold', color: 'error.main', ml: 0.25 }}
              >
                {`בדיוק`}
              </Typography>
            )}
          </Box>
        }
        variant="outlined"
        sx={{
          height: 'auto',
          minHeight: '30px',
          padding: '4px 10px',
          backgroundColor: '#e8f5e9',
          borderColor: '#a5d6a7'
        }}
      />
    );
  }
};
