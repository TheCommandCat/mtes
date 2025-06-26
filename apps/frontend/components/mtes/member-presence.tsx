import React, { useState, useMemo } from 'react';
import { WithId } from 'mongodb';
import { Member } from '@mtes/types';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  Tooltip
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Login as LoginIcon,
  Logout as LogoutIcon,
  PeopleOutline as PeopleOutlineIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

interface MemberPresenceProps {
  allMembers: WithId<Member>[];
  onMemberUpdate: (
    memberId: string,
    isPresent: boolean,
    replacedBy?: WithId<Member> | null
  ) => void;
}

const MemberPresence: React.FC<MemberPresenceProps> = ({ allMembers, onMemberUpdate }) => {
  // local types
  type SortKey = keyof Member | 'status' | 'isMM';
  type SortConfig = { key: SortKey; dir: 'asc' | 'desc' };

  const theme = useTheme();
  const [sortCfg, setSortCfg] = useState<SortConfig | null>(null);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [selected, setSelected] = useState<WithId<Member> | null>(null);

  // prepare replacements
  const { replacedIds, replacerIds, replacements } = useMemo(() => {
    const rIds = new Set<string>();
    const iIds = new Set<string>();
    const reps: { replaced: WithId<Member>; replacer: WithId<Member> }[] = [];

    allMembers.forEach(m => {
      if (m.replacedBy && (m.replacedBy as WithId<Member>).isPresent) {
        const replacer = m.replacedBy as WithId<Member>;
        reps.push({ replaced: m, replacer });
        rIds.add(m._id.toString());
        iIds.add(replacer._id.toString());
      }
    });

    return { replacedIds: rIds, replacerIds: iIds, replacements: reps };
  }, [allMembers]);

  // who can fill in?
  const availableMMs = useMemo(() => {
    if (!selected) return [];
    return allMembers.filter(m => {
      const id = m._id.toString();
      return (
        m.isMM &&
        m.city === selected.city &&
        m.isPresent &&
        !m.replacedBy &&
        !replacerIds.has(id) &&
        id !== selected._id.toString()
      );
    });
  }, [allMembers, replacerIds, selected]);

  // sorting
  const sorted = useMemo(() => {
    const arr = [...allMembers];
    if (sortCfg) {
      arr.sort((a, b) => {
        let av: any, bv: any;
        if (sortCfg.key === 'status') {
          av = a.isPresent;
          bv = b.isPresent;
        } else if (sortCfg.key === 'isMM') {
          av = a.isMM;
          bv = b.isMM;
        } else {
          av = a[sortCfg.key];
          bv = b[sortCfg.key];
        }
        if (typeof av === 'string') av = av.toLowerCase();
        if (typeof bv === 'string') bv = bv.toLowerCase();
        if (av < bv) return sortCfg.dir === 'asc' ? -1 : 1;
        if (av > bv) return sortCfg.dir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return arr;
  }, [allMembers, sortCfg]);

  const onSort = (key: SortKey) => {
    let dir: 'asc' | 'desc' = 'asc';
    if (sortCfg?.key === key && sortCfg.dir === 'asc') dir = 'desc';
    setSortCfg({ key, dir });
  };

  if (!allMembers.length) {
    return (
      <Paper
        elevation={3}
        sx={{
          p: 4,
          textAlign: 'center',
          m: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}
      >
        <PeopleOutlineIcon sx={{ fontSize: 48, color: 'grey.500' }} />
        <Typography variant="h6" color="text.secondary">
          לא נמצאו חברים להצגה.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          נסה להוסיף חברים חדשים או לרענן את הרשימה.
        </Typography>
      </Paper>
    );
  }

  // column defs right here
  const columns: { key: SortKey; label: string }[] = [
    { key: 'name', label: 'שם' },
    { key: 'city', label: 'מוסד שולח' },
    { key: 'isMM', label: 'סטטוס' }
  ];

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant="h5" align="center" gutterBottom sx={{ mb: 3, fontWeight: 'medium' }}>
        ניהול נוכחות חברים
      </Typography>

      <TableContainer component={Paper} elevation={3}>
        <Table sx={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <TableHead>
            <TableRow>
              {columns.map(({ key, label }) => (
                <TableCell
                  key={key}
                  align="center"
                  sx={{
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    padding: '12px 16px',
                    borderBottom: '2px solid rgba(224,224,224,1)',
                    fontWeight: 'bold',
                    backgroundColor: theme.palette.grey[100]
                  }}
                >
                  <TableSortLabel
                    active={sortCfg?.key === key}
                    direction={sortCfg?.key === key ? sortCfg.dir : 'asc'}
                    onClick={() => onSort(key)}
                  >
                    {label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell
                align="center"
                sx={{
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  padding: '12px 16px',
                  borderBottom: '2px solid rgba(224,224,224,1)',
                  fontWeight: 'bold',
                  backgroundColor: theme.palette.grey[100]
                }}
              >
                פעולות
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {sorted.map(m => {
              const id = m._id.toString();
              const isReplaced = replacedIds.has(id);
              const isReplacer = replacerIds.has(id);
              const rep = replacements.find(r => r.replaced._id.toString() === id);
              const inv = replacements.find(r => r.replacer._id.toString() === id);

              return (
                <TableRow
                  key={id}
                  sx={{
                    '&:nth-of-type(odd)': {
                      backgroundColor: alpha(theme.palette.action.hover, 0.02)
                    },
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.action.hover, 0.04)
                    }
                  }}
                >
                  {/* name */}
                  <TableCell
                    align="center"
                    sx={{
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(224,224,224,1)'
                    }}
                  >
                    <Box display="flex" flexDirection="column" alignItems="center">
                      <Typography sx={isReplaced ? { textDecoration: 'line-through' } : {}}>
                        {m.name}
                      </Typography>
                      {isReplaced && rep && (
                        <Typography variant="caption" color="text.secondary" fontStyle="italic">
                          (מוחלף/ת ע"י {rep.replacer.name})
                        </Typography>
                      )}
                      {isReplacer && inv && (
                        <Typography
                          variant="caption"
                          color="info.dark"
                          fontWeight="bold"
                          fontStyle="italic"
                        >
                          (מחליף/ה את {inv.replaced.name})
                        </Typography>
                      )}
                    </Box>
                  </TableCell>

                  {/* city */}
                  <TableCell
                    align="center"
                    sx={{
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(224,224,224,1)'
                    }}
                  >
                    {m.city}
                  </TableCell>

                  {/* status */}
                  <TableCell
                    align="center"
                    sx={{
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(224,224,224,1)'
                    }}
                  >
                    {m.isMM ? 'מ"מ' : 'נציג'}
                  </TableCell>

                  {/* actions */}
                  <TableCell
                    align="center"
                    sx={{
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(224,224,224,1)'
                    }}
                  >
                    {isReplaced ? (
                      <Tooltip title="בטל החלפה">
                        <Button
                          size="small"
                          color="error"
                          variant="contained"
                          startIcon={<CancelIcon />}
                          onClick={() => onMemberUpdate(id, false, null)}
                        >
                          בטל
                        </Button>
                      </Tooltip>
                    ) : m.isPresent ? (
                      <Button
                        color="error"
                        variant="outlined"
                        startIcon={<LogoutIcon />}
                        onClick={() => onMemberUpdate(id, false)}
                        disabled={isReplacer}
                      >
                        צ׳ק-אאוט
                      </Button>
                    ) : (
                      <Button
                        color="primary"
                        variant="contained"
                        startIcon={<LoginIcon />}
                        onClick={() => onMemberUpdate(id, true)}
                      >
                        צ׳ק-אין
                      </Button>
                    )}

                    {!m.isMM && !isReplaced && !isReplacer && (
                      <Button
                        sx={{ ml: 1 }}
                        variant="outlined"
                        onClick={() => {
                          setSelected(m);
                          setDlgOpen(true);
                        }}
                        disabled={m.isPresent}
                        title="החלף ע״י מ״מ"
                      >
                        החלף מ״מ
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Replacement Dialog */}
      <Dialog open={dlgOpen} onClose={() => setDlgOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle textAlign="center">
          בחר מ\"מ עבור {selected?.name} ({selected?.city})
        </DialogTitle>
        <DialogContent>
          {availableMMs.length ? (
            <List>
              {availableMMs.map(mm => (
                <ListItem key={mm._id.toString()} disablePadding>
                  <ListItemButton
                    onClick={() => {
                      onMemberUpdate(selected!._id.toString(), true, mm);
                      setDlgOpen(false);
                    }}
                  >
                    <ListItemText primary={mm.name} secondary="נוכח/ת" />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography align="center" p={2}>
              אין מ\"מים פנויים ב{selected?.city}.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button onClick={() => setDlgOpen(false)} variant="outlined">
            ביטול
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MemberPresence;
