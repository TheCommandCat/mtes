import { User } from '@mtes/types';
import React, { useState } from 'react';
import { Paper, IconButton, Typography, Box, Stack, Tooltip, Divider, InputBase, Grid } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { localizedRoles } from 'apps/frontend/localization/roles';

interface UsersTableProps {
  users: User[];
}

const getRoleColor = (role: User['role']) => {
    // A simple color generator based on role
    if (!role) return '#9e9e9e';
    const colors = ['#f44336', '#2196f3', '#4caf50', '#ff9800', '#9c27b0'];
    const hash = Array.from(role).reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    return colors[Math.abs(hash) % colors.length];
};


const UsersList: React.FC<UsersTableProps> = ({ users }) => {
  const [revealedPasswords, setRevealedPasswords] = useState<Record<number, boolean>>({});

  const togglePasswordVisibility = (index: number) => {
    setRevealedPasswords(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <Grid container spacing={3} sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {users.map((user, index) => (
        <Grid item xs={12} md={6} lg={4} key={index}>
            <Paper
            key={index}
            elevation={0}
            sx={{
                width: '100%',
                p: { xs: 2, sm: 2.5 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                borderRadius: 4,
                boxShadow: 'rgba(0, 0, 0, 0.08) 0px 4px 12px',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 'rgba(0, 0, 0, 0.12) 0px 10px 20px',
                },
                borderTop: `4px solid ${getRoleColor(user.role)}`,
            }}
            >
            <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                {user.role ? localizedRoles[user.role] : 'Unknown Role'}
                </Typography>
                {user.roleAssociation && (
                <Typography variant="body1" color="text.secondary" sx={{textAlign: 'right'}}>
                    עמדה: <b>{user.roleAssociation?.value || 'N/A'}</b>
                </Typography>
                )}
            </Stack>
            <Divider sx={{ my: 1.5, width: '100%' }} />
            {user.password && (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1, width: '100%' }}>
                <Typography variant="body1" color="text.secondary" sx={{ minWidth: '70px' }}>
                    Password:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, background: 'rgba(0,0,0,0.04)', borderRadius: 1, px: 1, py: 0.5 }}>
                    <InputBase
                        value={user.password}
                        type={revealedPasswords[index] ? 'text' : 'password'}
                        readOnly
                        sx={{
                            fontWeight: 500,
                            letterSpacing: revealedPasswords[index] ? 'normal' : '2px',
                            width: '100%',
                            fontSize: '1rem',
                            fontFamily: revealedPasswords[index] ? 'sans-serif' : 'monospace',
                            transition: 'letter-spacing 0.3s ease, font-family 0.3s ease'
                        }}
                        inputProps={{
                            style: {
                                padding: 0,
                            }
                        }}
                    />
                    <Tooltip title={revealedPasswords[index] ? 'Hide password' : 'Show password'}>
                        <IconButton
                        onClick={() => togglePasswordVisibility(index)}
                        aria-label={revealedPasswords[index] ? 'Hide password' : 'Show password'}
                        size="small"
                        sx={{ ml: 1}}
                        >
                        {revealedPasswords[index] ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                </Box>
                </Stack>
            )}
            </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

export default UsersList;
