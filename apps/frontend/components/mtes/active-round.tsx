import { Round, Member } from '@mtes/types';
import { Box, Typography, List, ListItem, Button, ListItemText, Divider } from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import SendIcon from '@mui/icons-material/Send';
import { WithId } from 'mongodb';

interface ActiveRoundProps {
  activeRound: Round;
  setActiveRound: (round: Round | null) => void;
  setSelectedRound: (round: WithId<Round> | null) => void;
  handleSendMember: (member: Member) => void;
}

export const ActiveRound: React.FC<ActiveRoundProps> = ({
  activeRound,
  setActiveRound,
  setSelectedRound,
  handleSendMember
}) => {
  return (
    <Box>
      <Typography variant="h5" align="center">
        {activeRound.name}
      </Typography>
      <Typography variant="subtitle1" gutterBottom align="center">
        רשימת מצביעים ({activeRound.allowedMembers.length})
      </Typography>
      <List>
        {activeRound.allowedMembers.map((member, index) => (
          <Box key={member.name}>
            <ListItem sx={{ display: 'flex', flexDirection: 'row-reverse' }}>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                onClick={() => handleSendMember(member)}
                startIcon={<SendIcon />}
                sx={{ ml: 2, direction: 'ltr' }}
              >
                שלח
              </Button>
              <ListItemText
                primary={member.name}
                secondary={member.city}
                sx={{ textAlign: 'right' }}
              />
            </ListItem>
            {index < activeRound.allowedMembers.length - 1 && <Divider />}
          </Box>
        ))}
      </List>
      <Button
        variant="outlined"
        color="error"
        onClick={() => {
          setActiveRound(null);
          setSelectedRound(null);
          enqueueSnackbar(`סבב ${activeRound.name} הסתיים`, { variant: 'info' });
        }}
      >
        סיים סבב
      </Button>
    </Box>
  );
};
