import { Box, Typography } from '@mui/material';

interface WaitingStateProps {
  title: string;
  subtitle?: string;
  error?: boolean;
}

export const WaitingState = ({ title, subtitle, error = false }: WaitingStateProps) => {
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 8,
        background: error ? 'none' : 'rgba(0,0,0,0.02)',
        borderRadius: 2
      }}
    >
      <Typography variant="h5" color={error ? 'error' : 'text.secondary'}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
};
