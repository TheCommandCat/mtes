import { Box, Typography, Stack, Button } from '@mui/material';

interface RoundHeaderProps {
  title: string;
  subtitle?: string;
  isActive?: boolean;
  isLocked?: boolean;
  onBack?: () => void;
  onLock?: () => void;
  onStop?: () => void;
  onStart?: () => void;
}

export const RoundHeader = ({
  title,
  subtitle,
  isActive,
  isLocked,
  onBack,
  onLock,
  onStop,
  onStart
}: RoundHeaderProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 4,
        pb: 3,
        borderBottom: '1px solid rgba(0,0,0,0.1)'
      }}
    >
      <Box>
        <Typography color="primary" gutterBottom>
          {subtitle || (isActive ? 'סבב פעיל' : 'סבב נבחר')}
        </Typography>
        <Typography variant="h4" fontWeight="bold">
          {title}
        </Typography>
      </Box>
      <Stack direction="row" spacing={2}>
        {onBack && (
          <Button variant="outlined" color="inherit" onClick={onBack} sx={{ px: 4, py: 1.5 }}>
            חזור
          </Button>
        )}
        {isActive && !isLocked && (
          <>
            {onLock && (
              <Button variant="outlined" color="warning" onClick={onLock} sx={{ px: 4, py: 1.5 }}>
                נעל וסיים סבב
              </Button>
            )}
            {onStop && (
              <Button variant="outlined" color="error" onClick={onStop} sx={{ px: 4, py: 1.5 }}>
                סיים סבב ללא נעילה
              </Button>
            )}
          </>
        )}
        {onStart && (
          <Button variant="contained" onClick={onStart} sx={{ px: 4 }}>
            התחל סבב
          </Button>
        )}
      </Stack>
    </Box>
  );
};
