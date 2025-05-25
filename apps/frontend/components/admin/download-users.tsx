import { WithId } from 'mongodb';
import { Button, ButtonProps } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { Division, ElectionEvent } from '@mtes/types';
import { getApiBase } from '../../lib/utils/fetch';

interface DownloadUsersButtonProps extends ButtonProps {
  event: WithId<ElectionEvent>;
}

const DownloadUsersButton: React.FC<DownloadUsersButtonProps> = ({ event, ...props }) => {
  return (
    <Button
      component="a"
      startIcon={<DownloadIcon />}
      variant="contained"
      href={`${getApiBase()}/api/admin/events/users/export`}
      target="_blank"
      download
      {...props}
    >
      הורדת קובץ סיסמאות
    </Button>
  );
};

export default DownloadUsersButton;
