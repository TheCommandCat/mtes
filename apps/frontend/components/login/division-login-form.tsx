import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import { WithId } from 'mongodb';
import { Button, Box, Typography, Stack, MenuItem, TextField } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { Role, RoleTypes } from '@mtes/types';
import FormDropdown from './form-dropdown';
import { apiFetch } from '../../lib/utils/fetch';
import { localizedRoles } from '../../localization/roles';

interface DivisionLoginFormProps {
  votingStands: number;
}

const DivisionLoginForm: React.FC<DivisionLoginFormProps> = ({ votingStands }) => {
  const [role, setRole] = useState<Role>('' as Role);
  const [password, setPassword] = useState<string>('');
  const [association, setAssociation] = useState<number>();

  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const login = () => {
    apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isAdmin: false,
        role,
        password,
        ...(association
          ? {
              roleAssociation: {
                type: 'stand',
                value: association
              }
            }
          : undefined)
      })
    })
      .then(async res => {
        const data = await res.json();
        if (data && !data.error) {
          const returnUrl = router.query.returnUrl || `/mtes`;
          router.push(returnUrl as string);
        } else if (data.error) {
          if (data.error === 'INVALID_CREDENTIALS') {
            enqueueSnackbar('אופס, הסיסמה שגויה.', { variant: 'error' });
          } else {
            enqueueSnackbar('הגישה נדחתה, נסו שנית מאוחר יותר.', { variant: 'error' });
          }
        } else {
          throw new Error(res.statusText);
        }
      })
      .catch(() => enqueueSnackbar('אופס, החיבור לשרת נכשל.', { variant: 'error' }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    login();
  };

  return (
    <Stack direction="column" spacing={2} component="form" onSubmit={handleSubmit}>
      <Typography variant="h2" textAlign="center">
        התחברות לאירוע:
      </Typography>
      <Typography variant="h2" textAlign="center"></Typography>

      <FormDropdown
        id="select-division-role"
        value={role}
        label="תפקיד"
        onChange={e => {
          setRole(e.target.value as Role);
        }}
      >
        {RoleTypes.map((r: Role) => {
          return (
            <MenuItem value={r as Role} key={r as Role}>
              {localizedRoles[r as Role]}
            </MenuItem>
          );
        })}
      </FormDropdown>
      {role === 'voting-stand' && (
        <FormDropdown
          id="select-role-association"
          value={association}
          label={'קלפי'}
          onChange={e => setAssociation(e.target.value)}
        >
          {Array.from({ length: votingStands }, (_, i) => i + 1).map(stand => (
            <MenuItem value={stand} key={stand}>
              קלפי {stand}
            </MenuItem>
          ))}
        </FormDropdown>
      )}
      <TextField
        fullWidth
        variant="outlined"
        type="password"
        label="סיסמה"
        value={password}
        onChange={e => setPassword(e.target.value)}
        slotProps={{ htmlInput: { dir: 'ltr' } }}
      />

      <Box justifyContent="flex-end" display="flex" pt={4}>
        <Button
          endIcon={<ChevronLeftIcon />}
          disabled={!role || !password || (role === 'voting-stand' && !association)}
          type="submit"
          variant="contained"
        >
          התחבר
        </Button>
      </Box>
    </Stack>
  );
};

export default DivisionLoginForm;
