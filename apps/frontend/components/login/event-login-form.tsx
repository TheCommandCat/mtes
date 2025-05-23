import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import { WithId } from 'mongodb';
import { Button, Box, Typography, Stack, MenuItem, TextField } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { Role, ElectionEvent } from '@mtes/types';
// import FormDropdown from './form-dropdown';
import { apiFetch } from '../../lib/utils/fetch';
import { localizedRoles } from '../../localization/roles';
import FormDropdown from './form-dropdown';

interface Props {
  event: WithId<ElectionEvent>;
  onCancel: () => void;
}

const EventLoginForm: React.FC<Props> = ({ event, onCancel }): JSX.Element => {
  const [role, setRole] = useState<Role>('' as Role);
  const [password, setPassword] = useState<string>('');

  const loginRoles = Object.keys(event.eventUsers);

  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const login = (captchaToken?: string) => {
    apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isAdmin: false,
        // eventId: event._id,
        role,
        password,
        ...(captchaToken ? { captchaToken } : {})
      })
    })
      .then(async res => {
        const data = await res.json();
        if (data && !data.error) {
          document.getElementById('recaptcha-script')?.remove();
          document.querySelector('.grecaptcha-badge')?.remove();
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
      <Box justifyContent="flex-start" display="flex">
        <Button startIcon={<ChevronRightIcon />} onClick={onCancel}>
          לבחירת אירוע
        </Button>
      </Box>
      <Typography variant="h2" textAlign="center">
        התחברות לאירוע:
      </Typography>
      <Typography variant="h2" textAlign="center">
        {event.name}
      </Typography>

      <FormDropdown
        id="select-division-role"
        value={role}
        label="תפקיד"
        onChange={e => {
          setRole(e.target.value as Role);
        }}
      >
        {loginRoles
          .filter((r): r is Role => r === 'election-manager' || r === 'voting-stand')
          .map((r: Role) => {
            return (
              <MenuItem value={r} key={r}>
                {localizedRoles[r]}
              </MenuItem>
            );
          })}
      </FormDropdown>

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
          disabled={!role || !password}
          type="submit"
          variant="contained"
        >
          התחבר
        </Button>
      </Box>
    </Stack>
  );
};

export default EventLoginForm;
