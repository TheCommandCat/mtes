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
  TableSortLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Grid,
  Tooltip,
  Chip
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import CancelIcon from '@mui/icons-material/Cancel';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

interface MemberPresenceProps {
  allMembers: WithId<Member>[];
  onMemberUpdate: (
    memberId: string,
    isPresent: boolean,
    replacedBy?: WithId<Member> | null
  ) => void;
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
  const theme = useTheme();
  // console.log('MemberPresence rendered or re-rendered. Received allMembers:', allMembers);

  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [isMMDialogOpen, setIsMMDialogOpen] = useState(false);
  const [selectedMemberForMM, setSelectedMemberForMM] = useState<WithId<Member> | null>(null);

  const handleOpenMMDialog = (member: WithId<Member>) => {
    setSelectedMemberForMM(member);
    setIsMMDialogOpen(true);
  };

  const handleCloseMMDialog = () => {
    setSelectedMemberForMM(null);
    setIsMMDialogOpen(false);
  };

  const handleSelectMM = (mmMember: WithId<Member>) => {
    if (selectedMemberForMM) {
      // The original member is now "present" via replacement, and their replacedBy is the mmMember.
      onMemberUpdate(selectedMemberForMM._id.toString(), true, mmMember);
    }
    handleCloseMMDialog();
  };

  const availableMMsForSelectedMember = useMemo(() => {
    if (!selectedMemberForMM || !allMembers) return [];
    return allMembers.filter(
      member =>
        member.isMM &&
        member.city === selectedMemberForMM.city &&
        member._id.toString() !== selectedMemberForMM._id.toString() && // Ensure MM is not the member themselves
        !member.replacedBy && // Available MM should not be already replacing someone else
        member.isPresent // Available MM must be present
    );
  }, [allMembers, selectedMemberForMM]);

  const replacementInfo = useMemo(() => {
    const replacements: { replaced: WithId<Member>; replacer: WithId<Member> }[] = [];
    const membersBeingReplacedIds = new Set<string>();
    const membersActingAsReplacersIds = new Set<string>();

    allMembers.forEach(member => {
      if (member.replacedBy) {
        const replacer = allMembers.find(
          m => m._id.toString() === member.replacedBy?.toString() && m.isPresent
        );
        if (replacer) {
          replacements.push({ replaced: member, replacer });
          membersBeingReplacedIds.add(member._id.toString());
          membersActingAsReplacersIds.add(replacer._id.toString());
        }
      }
    });
    return { replacements, membersBeingReplacedIds, membersActingAsReplacersIds };
  }, [allMembers]);

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
          aValue = a[sortConfig.key as keyof Member];
          bValue = b[sortConfig.key as keyof Member];
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
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
              {/* Name Header */}
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
              {/* City Header */}
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
              {/* Status (isMM) Header */}
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
                  סטטוס
                </TableSortLabel>
              </TableCell>
              {/* Actions Header */}
              <TableCell align="center" sx={headerCellSx}>
                <TableSortLabel
                  active={false}
                  hideSortIcon
                  IconComponent={SortPlaceholderIcon}
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
            {sortedMembers.map(member => {
              const memberIdStr = member._id.toString();
              const isBeingReplaced = replacementInfo.membersBeingReplacedIds.has(memberIdStr);
              const replacerDetails = isBeingReplaced
                ? replacementInfo.replacements.find(r => r.replaced._id.toString() === memberIdStr)
                    ?.replacer
                : undefined;
              const isActingAsReplacer =
                replacementInfo.membersActingAsReplacersIds.has(memberIdStr);
              const replacedMemberDetails = isActingAsReplacer
                ? replacementInfo.replacements.find(r => r.replacer._id.toString() === memberIdStr)
                    ?.replaced
                : undefined;

              return (
                <TableRow
                  key={memberIdStr}
                  sx={{
                    transition: 'background-color 0.3s ease, opacity 0.3s ease',
                    '&:nth-of-type(odd)': {
                      backgroundColor: alpha(theme.palette.action.hover, 0.02)
                    },
                    '&:hover': { backgroundColor: alpha(theme.palette.action.hover, 0.04) },
                    ...(isBeingReplaced && {
                      backgroundColor: theme.palette.grey[300],
                      opacity: 0.6,
                      fontStyle: 'italic'
                    }),
                    ...(isActingAsReplacer && {
                      backgroundColor: alpha(theme.palette.info.light, 0.25)
                    })
                  }}
                >
                  {/* Name Cell */}
                  <TableCell align="center" sx={commonCellSx}>
                    <Box display="flex" flexDirection="column" alignItems="center">
                      <Typography sx={isBeingReplaced ? { textDecoration: 'line-through' } : {}}>
                        {member.name}
                      </Typography>
                      {isBeingReplaced && replacerDetails && (
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary', fontStyle: 'italic' }}
                        >
                          (מוחלף/ת ע"י {replacerDetails.name})
                        </Typography>
                      )}
                      {isActingAsReplacer && replacedMemberDetails && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: theme.palette.info.dark,
                            fontWeight: 'bold',
                            fontStyle: 'italic'
                          }}
                        >
                          (מחליף/ה את {replacedMemberDetails.name})
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  {/* City Cell */}
                  <TableCell align="center" sx={commonCellSx}>
                    {member.city}
                  </TableCell>
                  {/* Status (isMM) Cell */}
                  <TableCell align="center" sx={commonCellSx}>
                    {member.isMM ? 'מ"מ' : 'נציג'}
                  </TableCell>
                  {/* Actions Cell */}
                  <TableCell align="center" sx={commonCellSx}>
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '36.5px'
                      }}
                    >
                      {isBeingReplaced ? (
                        <Tooltip
                          title={`לחץ לביטול ההחלפה של ${member.name} ע"י ${replacerDetails?.name}`}
                        >
                          <Button
                            variant="contained"
                            size="small"
                            color="error"
                            onClick={() => onMemberUpdate(memberIdStr, false, null)} // Pass null to clear replacedBy
                            startIcon={<CancelIcon />}
                          >
                            בטל החלפה
                          </Button>
                        </Tooltip>
                      ) : (
                        <>
                          {member.isPresent ? (
                            <Tooltip
                              title={
                                isActingAsReplacer
                                  ? `${member.name} מחליף/ה כעת את ${replacedMemberDetails?.name}, לא ניתן לבצע צ'ק-אאוט ישירות`
                                  : "בצע צ'ק-אאוט"
                              }
                            >
                              <span>
                                <Button
                                  variant="outlined"
                                  color="error"
                                  onClick={() => onMemberUpdate(memberIdStr, false)} // Standard check-out
                                  startIcon={<LogoutIcon />}
                                  sx={{ minWidth: '110px' }}
                                  disabled={isActingAsReplacer} // Cannot check out if actively replacing someone
                                >
                                  צ׳ק-אאוט
                                </Button>
                              </span>
                            </Tooltip>
                          ) : (
                            <Button
                              variant="contained"
                              color="primary"
                              onClick={() => onMemberUpdate(memberIdStr, true)} // Standard check-in
                              startIcon={<LoginIcon />}
                              sx={{ minWidth: '110px' }}
                            >
                              צ׳ק-אין
                            </Button>
                          )}
                          {!member.isMM && ( // Regular members can be replaced by an MM
                            <Tooltip
                              title={
                                member.isPresent
                                  ? 'חבר כבר נוכח (אולי מוחלף), בטל החלפה קודם אם נדרש'
                                  : isActingAsReplacer
                                  ? 'חבר זה מחליף כעת מישהו אחר'
                                  : 'החלף חבר זה עם ממלא מקום נוכח מאותה עיר'
                              }
                            >
                              <span>
                                <Button
                                  variant="outlined"
                                  onClick={() => handleOpenMMDialog(member)}
                                  disabled={member.isPresent || isActingAsReplacer} // Cannot select MM if member is present or is an active replacer
                                  sx={{ minWidth: '110px' }}
                                >
                                  החלף ע"י מ"מ
                                </Button>
                              </span>
                            </Tooltip>
                          )}
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {selectedMemberForMM && (
        <Dialog open={isMMDialogOpen} onClose={handleCloseMMDialog} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ textAlign: 'center', fontWeight: 'medium' }}>
            בחר ממלא מקום עבור {selectedMemberForMM.name} ({selectedMemberForMM.city})
          </DialogTitle>
          <DialogContent>
            {availableMMsForSelectedMember.length > 0 ? (
              <List>
                {availableMMsForSelectedMember.map(mm => (
                  <ListItem key={mm._id.toString()} disablePadding>
                    <ListItemButton
                      onClick={() => handleSelectMM(mm)}
                      // disabled={!mm.isPresent} // Already filtered in availableMMsForSelectedMember
                      sx={{
                        borderRadius: 1,
                        marginY: 0.5,
                        '&:hover': { backgroundColor: 'action.hover' }
                      }}
                    >
                      <ListItemText
                        primary={mm.name}
                        secondary={'נוכח/ת'}
                        sx={{ textAlign: 'right' }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body1" sx={{ textAlign: 'center', padding: 2 }}>
                לא נמצאו ממלאי מקום נוכחים פנויים מאותה עיר ({selectedMemberForMM.city}).
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', paddingBottom: 2 }}>
            <Button onClick={handleCloseMMDialog} variant="outlined">
              ביטול
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default MemberPresence;
