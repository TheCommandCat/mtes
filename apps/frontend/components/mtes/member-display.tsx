import { Box, Typography, Paper, Tooltip } from '@mui/material';
import { Member } from '@mtes/types';
import { WithId } from 'mongodb';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

interface MemberDisplayProps {
  member: WithId<Member>;
}

export const MemberDisplay = ({ member }: MemberDisplayProps) => {
  const displayName = member.replacedBy ? member.replacedBy.name : member.name;
  const displayInitial = displayName.charAt(0);
  const isPresent = member.isPresent;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        transition: 'all 0.2s ease-in-out',
        opacity: isPresent ? 1 : 0.7,
        borderColor: isPresent ? 'primary.light' : 'error.light',
        background: isPresent ? 'rgba(33, 150, 243, 0.05)' : 'rgba(243, 33, 33, 0.05)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 2
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 2, sm: 3 } }}>
        <Box
          sx={{
            width: { xs: 64, sm: 72 },
            height: { xs: 64, sm: 72 },
            borderRadius: '50%',
            bgcolor: isPresent ? 'primary.main' : 'error.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: { xs: '28px', sm: '32px' },
            flexShrink: 0,
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'scale(1.05)'
            }
          }}
        >
          {displayInitial}
        </Box>
        <Box sx={{ py: 0.5, flex: 1 }}>
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{
              mb: 0.5,
              lineHeight: 1.2
            }}
          >
            {displayName}
          </Typography>
          <Typography
            color="text.secondary"
            sx={{
              mb: member.replacedBy ? 1.5 : 0
            }}
          >
            {member.city}
          </Typography>
          {member.replacedBy && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                py: 0.5,
                px: 1.5,
                bgcolor: 'rgba(33, 150, 243, 0.08)',
                borderRadius: 1,
                width: 'fit-content'
              }}
            >
              <Tooltip title="Replacement member">
                <SwapHorizIcon
                  color="info"
                  fontSize="small"
                  sx={{
                    opacity: 0.9,
                    transform: 'scale(0.9)'
                  }}
                />
              </Tooltip>
              <Typography
                variant="body2"
                color="info.main"
                sx={{
                  fontWeight: 500,
                  opacity: 0.9
                }}
              >
                מחליף\ה את {member.name}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );
};
