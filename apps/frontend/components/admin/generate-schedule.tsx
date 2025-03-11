import { WithId } from 'mongodb';
import { Button, ButtonProps } from '@mui/material';
import NoteAddRoundedIcon from '@mui/icons-material/NoteAddRounded';
import { Division, ElectionEvent } from '@mtes/types';

interface GenerateScheduleButtonProps extends ButtonProps {
  event: WithId<ElectionEvent>;
}

const GenerateScheduleButton: React.FC<GenerateScheduleButtonProps> = ({ event, ...props }) => {
  return (
    <>
      <Button variant="contained" startIcon={<NoteAddRoundedIcon />} disabled={true} {...props}>
        יצירת לוח זמנים
      </Button>
    </>
  );
};

export default GenerateScheduleButton;
