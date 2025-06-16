import { Member } from '@mtes/types';
import { WithId } from 'mongodb';
import React, { useState, useMemo } from 'react';
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
  Box,
  TableSortLabel
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';

interface MemberPresenceProps {
  allMembers: WithId<Member>[];
  onMemberUpdate: (memberId: string, isPresent: boolean) => void;
}

type SortDirection = 'asc' | 'desc';
interface SortConfig {
  key: keyof Member | 'status' | 'isMM';
  direction: SortDirection;
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

const SortPlaceholderIcon = () => (
  <Box
    component="span"
    sx={{
      transform: 'none !important',
      width: '1em',
      height: '1em',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}
  >
    -
  </Box>
);

const MemberPresence: React.FC<MemberPresenceProps> = ({ allMembers, onMemberUpdate }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const sortedMembers = useMemo(() => {
    if (!allMembers) return [];
    let sortableItems = [...allMembers];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'status') {
          aValue = a.isPresent || false;
          bValue = b.isPresent || false;
        } else if (sortConfig.key === 'isMM') {
          aValue = a.isMM || false;
          bValue = b.isMM || false;
        } else {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [allMembers, sortConfig]);

  const requestSort = (key: keyof Member | 'status' | 'isMM') => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

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
              <TableCell
                align="center"
                sx={headerCellSx}
                sortDirection={sortConfig?.key === 'name' ? sortConfig.direction : false}
              >
                <TableSortLabel
                  active={sortConfig?.key === 'name'}
                  direction={sortConfig?.key === 'name' ? sortConfig.direction : 'asc'}
                  onClick={() => requestSort('name')}
                  IconComponent={sortConfig?.key === 'name' ? undefined : SortPlaceholderIcon}
                  sx={{
                    '& .MuiTableSortLabel-icon': {
                      color: 'rgba(0, 0, 0, 0.87) !important',
                      opacity: 1
                    }
                  }}
                >
                  שם
                </TableSortLabel>
              </TableCell>
              <TableCell
                align="center"
                sx={headerCellSx}
                sortDirection={sortConfig?.key === 'city' ? sortConfig.direction : false}
              >
                <TableSortLabel
                  active={sortConfig?.key === 'city'}
                  direction={sortConfig?.key === 'city' ? sortConfig.direction : 'asc'}
                  onClick={() => requestSort('city')}
                  IconComponent={sortConfig?.key === 'city' ? undefined : SortPlaceholderIcon}
                  sx={{
                    '& .MuiTableSortLabel-icon': {
                      color: 'rgba(0, 0, 0, 0.87) !important',
                      opacity: 1
                    }
                  }}
                >
                  עיר
                </TableSortLabel>
              </TableCell>
              <TableCell
                align="center"
                sx={headerCellSx}
                sortDirection={sortConfig?.key === 'isMM' ? sortConfig.direction : false}
              >
                <TableSortLabel
                  active={sortConfig?.key === 'isMM'}
                  direction={sortConfig?.key === 'isMM' ? sortConfig.direction : 'asc'}
                  onClick={() => requestSort('isMM')}
                  IconComponent={sortConfig?.key === 'isMM' ? undefined : SortPlaceholderIcon}
                  sx={{
                    '& .MuiTableSortLabel-icon': {
                      color: 'rgba(0, 0, 0, 0.87) !important',
                      opacity: 1
                    }
                  }}
                >
                  תפקיד
                </TableSortLabel>
              </TableCell>
              <TableCell
                align="center"
                sx={headerCellSx}
                sortDirection={sortConfig?.key === 'status' ? sortConfig.direction : false}
              >
                <TableSortLabel
                  active={sortConfig?.key === 'status'}
                  direction={sortConfig?.key === 'status' ? sortConfig.direction : 'asc'}
                  onClick={() => requestSort('status')}
                  IconComponent={sortConfig?.key === 'status' ? undefined : SortPlaceholderIcon}
                  sx={{
                    '& .MuiTableSortLabel-icon': {
                      color: 'rgba(0, 0, 0, 0.87) !important',
                      opacity: 1
                    }
                  }}
                >
                  פעולות
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedMembers.map((member) => (
              <TableRow
                key={member._id.toString()}
                sx={{
                  '&:nth-of-type(odd)': { backgroundColor: alpha("#000", 0.02) },
                  '&:hover': { backgroundColor: alpha("#000", 0.04) }
                }}
              >
                <TableCell align="center" sx={commonCellSx}>
                  {member.name}
                </TableCell>
                <TableCell align="center" sx={commonCellSx}>
                  {member.city}
                </TableCell>
                <TableCell align="center" sx={commonCellSx}>
                  {member.isMM ? 'מ"מ' : 'נציג'}
                </TableCell>
                <TableCell align="center" sx={commonCellSx}>
                  {member.isPresent ? (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => onMemberUpdate(member._id.toString(), false)}
                      startIcon={<LogoutIcon />}
                      sx={{ minWidth: '120px' }}
                    >
                      צ׳ק-אאוט
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => onMemberUpdate(member._id.toString(), true)}
                      startIcon={<LoginIcon />}
                      sx={{ minWidth: '120px' }}
                    >
                      צ׳ק-אין
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default MemberPresence;
