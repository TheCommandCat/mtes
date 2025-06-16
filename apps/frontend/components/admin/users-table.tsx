import { User } from '@mtes/types';
import React, { useState } from 'react';
import { Paper, IconButton, Typography, Box, Stack, Tooltip, Divider, InputBase } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { localizedRoles } from 'apps/frontend/localization/roles';

interface UsersTableProps {
  users: User[];
}

const UsersList: React.FC<UsersTableProps> = ({ users }) => {
  const [revealedPasswords, setRevealedPasswords] = useState<Record<number, boolean>>({});

  const togglePasswordVisibility = (index: number) => {
    setRevealedPasswords(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        p: { xs: 1, sm: 2, md: 3 },
        width: '100%',
        maxWidth: 700,
        mx: 'auto'
      }}
    >
      {users.map((user, index) => (
        <Paper
          key={index}
          elevation={4}
          sx={{
            width: '100%',
            p: { xs: 2, sm: 3 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            mb: 2,
            borderRadius: 3,
            boxShadow: 3,
            transition: 'box-shadow 0.2s, background 0.2s',
            '&:hover': {
              boxShadow: 8,
              backgroundColor: 'action.hover'
            }
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
              {user.role ? localizedRoles[user.role] : 'Unknown Role'}
            </Typography>
            {user.roleAssociation && (
              <Typography variant="body2" color="text.secondary">
                עמדה: <b>{user.roleAssociation?.value || 'N/A'}</b>
              </Typography>
            )}
          </Stack>
          <Divider sx={{ my: 1, width: '100%' }} />
          {user.password && (
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 1, width: '100%' }}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                Password:
              </Typography>
              <InputBase
                value={user.password}
                type={revealedPasswords[index] ? 'text' : 'password'}
                readOnly
                sx={{
                  fontWeight: 500,
                  letterSpacing: 2,
                  width: 160,
                  background: 'rgba(0,0,0,0.03)',
                  borderRadius: 1,
                  px: 1,
                  py: 0.5,
                  fontSize: 16,
                  transition: 'background 0.2s'
                }}
                inputProps={{
                  style: {
                    padding: 0,
                    fontFamily: 'monospace',
                  }
                }}
              />
              <Tooltip title={revealedPasswords[index] ? 'Hide password' : 'Show password'}>
                <IconButton
                  onClick={() => togglePasswordVisibility(index)}
                  aria-label={revealedPasswords[index] ? 'Hide password' : 'Show password'}
                  size="small"
                >
                  {revealedPasswords[index] ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Paper>
      ))}
    </Box>
  );
};

export default UsersList;
