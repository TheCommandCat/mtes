import { Member } from '@mtes/types';
import { WithId } from 'mongodb';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Typography
} from '@mui/material';
import { apiFetch } from '../../lib/utils/fetch';
import { enqueueSnackbar } from 'notistack';
import { on } from 'events';

interface MemberPresenceProps {
  allMembers: WithId<Member>[];
  onMemberUpdate: (memberId: string, isPresent: boolean) => void; // Callback to refresh data in parent
}

const MemberPresence: React.FC<MemberPresenceProps> = ({ allMembers, onMemberUpdate }) => {
  return (
    <TableContainer component={Paper}>
      <Table aria-label="member presence table">
        <TableHead>
          <TableRow>
            <TableCell align="center" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
              שם
            </TableCell>
            <TableCell align="center" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
              עיר
            </TableCell>
            <TableCell align="center" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
              סטטוס
            </TableCell>
            <TableCell align="center" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
              פעולות
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {allMembers.map(member => {
            const isPresent = member.isPresent || false;
            return (
              <TableRow
                key={member._id.toString()}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell
                  component="th"
                  scope="row"
                  align="center"
                  sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                >
                  {member.name}
                </TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  {member.city}
                </TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  <Typography color={isPresent ? 'success.main' : 'error.main'} align="center">
                    {isPresent ? 'נוכח' : 'נעדר'}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  <Button
                    variant="contained"
                    color={isPresent ? 'secondary' : 'primary'}
                    // use on memebr update to do all the login in the parent
                    onClick={() => onMemberUpdate(member._id.toString(), !isPresent)}
                  >
                    {isPresent ? "צ'ק-אאוט" : "צ'ק-אין"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default MemberPresence;
