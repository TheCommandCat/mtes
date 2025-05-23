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
  Typography,
  Box
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';

interface MemberPresenceProps {
  allMembers: WithId<Member>[];
  onMemberUpdate: (memberId: string, isPresent: boolean) => void;
}

const commonCellSx = {
  whiteSpace: 'normal',
  wordBreak: 'break-word',
  padding: '12px 16px',
  borderBottom: '1px solid rgba(224, 224, 224, 1)'
};

const headerCellSx = {
  ...commonCellSx,
  fontWeight: 'bold',
  backgroundColor: 'grey.100',
  borderBottom: '2px solid rgba(224, 224, 224, 1)'
};

const MemberPresence: React.FC<MemberPresenceProps> = ({ allMembers, onMemberUpdate }) => {
  if (!allMembers || allMembers.length === 0) {
    return (
      <Paper
        elevation={3}
        sx={{
          padding: 4,
          textAlign: 'center',
          margin: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}
      >
        <PeopleOutlineIcon sx={{ fontSize: 48, color: 'grey.500' }} />
        <Typography variant="h6" component="p" color="text.secondary">
          לא נמצאו חברים להצגה.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          נסה להוסיף חברים חדשים או לרענן את הרשימה.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ padding: { xs: 1, sm: 2, md: 3 } }}>
      <Typography
        variant="h5"
        component="h2"
        gutterBottom
        sx={{ textAlign: 'center', marginBottom: 3, fontWeight: 'medium' }}
      >
        ניהול נוכחות חברים
      </Typography>
      <TableContainer component={Paper} elevation={3}>
        <Table
          aria-label="member presence table"
          sx={{ borderCollapse: 'separate', borderSpacing: 0 }}
        >
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={headerCellSx}>
                שם
              </TableCell>
              <TableCell align="center" sx={headerCellSx}>
                עיר
              </TableCell>
              {/* Status Header Cell Removed */}
              <TableCell align="center" sx={headerCellSx}>
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
                  sx={theme => ({
                    backgroundColor: isPresent
                      ? alpha(theme.palette.success.main, 0.08)
                      : alpha(theme.palette.error.main, 0.08),
                    '&:last-child td, &:last-child th': { borderBottom: 0 },
                    '& td, & th': {
                      borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`
                    },
                    '&:hover': {
                      backgroundColor: isPresent
                        ? alpha(theme.palette.success.main, 0.16)
                        : alpha(theme.palette.error.main, 0.16)
                    },
                    transition: 'background-color 0.2s ease-in-out'
                  })}
                >
                  <TableCell component="th" scope="row" align="center" sx={commonCellSx}>
                    {member.name}
                  </TableCell>
                  <TableCell align="center" sx={commonCellSx}>
                    {member.city || '-'}
                  </TableCell>
                  {/* Status Data Cell Removed */}
                  <TableCell align="center" sx={commonCellSx}>
                    <Button
                      variant={isPresent ? 'outlined' : 'contained'}
                      color={isPresent ? 'error' : 'primary'}
                      onClick={() => onMemberUpdate(member._id.toString(), !isPresent)}
                      startIcon={isPresent ? <LogoutIcon /> : <LoginIcon />}
                      sx={{ minWidth: '120px' }}
                    >
                      {isPresent ? 'צ׳ק-אאוט' : 'צ׳ק-אין'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default MemberPresence;
