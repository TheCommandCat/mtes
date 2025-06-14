import { User } from '@mtes/types';
import React, { useState } from 'react';
import { Paper, IconButton, Typography, Box } from '@mui/material';
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
        gap: 3,
        p: { xs: 1, sm: 2, md: 3 },
        width: '100%'
      }}
    >
      {users.map((user, index) => (
        <Paper
          key={index}
          elevation={3}
          sx={{
            width: '100%',
            maxWidth: '600px',
            p: { xs: 2, sm: 3 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            '&:hover': {
              boxShadow: 6,
              backgroundColor: 'action.hover'
            }
          }}
        >
          <Typography variant="h4" component="div" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            {user.role ? localizedRoles[user.role] : 'Unknown Role'}
          </Typography>
          <Typography
            sx={{ display: 'block', mb: 1 }}
            component="div"
            variant="body1"
            color="text.secondary"
          />
          <Typography
            sx={{ display: 'block', mb: 1 }}
            component="div"
            variant="body1"
            color="text.primary"
          >
            עמדה מספר {user.roleAssociation?.value || 'N/A'}
          </Typography>
          {user.password && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                mt: 2
              }}
            >
              <Typography variant="body1" component="span" color="text.primary">
                {revealedPasswords[index] ? user.password : '••••••••'}
              </Typography>
              <IconButton
                onClick={() => togglePasswordVisibility(index)}
                aria-label={revealedPasswords[index] ? 'Hide password' : 'Show password'}
                size="medium"
              >
                {revealedPasswords[index] ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </Box>
          )}
        </Paper>
      ))}
    </Box>
  );
};

export default UsersList;
