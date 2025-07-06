import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { WaitingState } from 'apps/frontend/components/mtes/waiting-state';

interface AudienceMessageDisplayProps {
  message: string | null;
}

const AudienceMessageDisplay: React.FC<AudienceMessageDisplayProps> = ({ message }) => {
  const [fontSize, setFontSize] = useState('4rem');

  // Calculate font size based on message length to fit the screen
  const calculateFontSize = useMemo(() => {
    if (!message) return '4rem';

    const messageLength = message.length;

    // Base font size calculation - scale down as message gets longer
    let baseFontSize = 4; // Starting at 4rem

    if (messageLength <= 20) {
      baseFontSize = 6; // Very short messages - large font
    } else if (messageLength <= 50) {
      baseFontSize = 5; // Short messages
    } else if (messageLength <= 100) {
      baseFontSize = 4; // Medium messages
    } else if (messageLength <= 200) {
      baseFontSize = 3; // Long messages
    } else if (messageLength <= 400) {
      baseFontSize = 2.5; // Very long messages
    } else {
      baseFontSize = 2; // Extremely long messages
    }

    return `${baseFontSize}rem`;
  }, [message]);

  useEffect(() => {
    setFontSize(calculateFontSize);
  }, [calculateFontSize]);

  if (!message || message.trim() === '') {
    return (
      <Box
        sx={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f8f9fa'
        }}
      >
        <WaitingState title="לא נבחרה הודעה" subtitle="יש לבחור הודעה להצגה" />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          background:
            'url(data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><g fill="%23ffffff" fill-opacity="0.2"><path d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/></g></g></svg>)'
        }}
      />

      {/* Main message container */}
      <Paper
        elevation={10}
        sx={{
          p: { xs: 4, sm: 6, md: 8 },
          margin: { xs: 2, sm: 4 },
          maxWidth: '95vw',
          maxHeight: '90vh',
          overflow: 'auto',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: 4,
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography
          variant="h1"
          component="h1"
          sx={{
            fontSize: fontSize,
            fontWeight: 'bold',
            color: 'text.primary',
            lineHeight: 1.2,
            textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
            wordBreak: 'break-word',
            hyphens: 'auto',
            // Responsive font sizing
            '@media (max-width: 600px)': {
              fontSize: `calc(${fontSize} * 0.7)`
            },
            '@media (max-width: 900px)': {
              fontSize: `calc(${fontSize} * 0.8)`
            },
            '@media (max-width: 1200px)': {
              fontSize: `calc(${fontSize} * 0.9)`
            }
          }}
        >
          {message}
        </Typography>
      </Paper>
    </Box>
  );
};

export default AudienceMessageDisplay;
