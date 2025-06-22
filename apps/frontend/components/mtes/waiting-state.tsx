import { Paper, Typography } from '@mui/material';

interface WaitingStateProps {
  title: string;
  subtitle?: string;
  error?: boolean;
}

export const WaitingState = ({ title, subtitle, error = false }: WaitingStateProps) => {
  return (
    <Paper
      elevation={6}
      sx={{
        textAlign: 'center',
        p: { xs: 4, sm: 8 },
        width: '100%',
        maxWidth: '800px',
        borderRadius: 4,
        background: error
          ? 'linear-gradient(145deg, #ffcdd2 0%, #ef9a9a 100%)'
          : 'linear-gradient(145deg, #e3f2fd 0%, #bbdefb 100%)',
        border: '1px solid',
        borderColor: error ? 'error.main' : 'primary.main',
        boxShadow: '0 10px 20px rgba(0,0,0,0.15)'
      }}
    >
      <Typography
        variant="h2"
        component="h2"
        color={error ? 'error.dark' : 'primary.dark'}
        sx={{
          mb: 2,
          fontWeight: 'bold',
          textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="h5" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
};
