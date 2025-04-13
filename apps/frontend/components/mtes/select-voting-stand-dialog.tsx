import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Typography
} from '@mui/material';

interface SelectVotingStandDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (standId: number) => void;
  votingStands: number[];
  memberName: string;
}

const SelectVotingStandDialog: React.FC<SelectVotingStandDialogProps> = ({
  open,
  onClose,
  onSelect,
  votingStands,
  memberName
}) => {
  const [selectedStand, setSelectedStand] = useState<number | ''>('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const handleClose = () => {
    setSelectedStand('');
    setHasAttemptedSubmit(false);
    onClose();
  };

  const handleSubmit = () => {
    setHasAttemptedSubmit(true);

    if (selectedStand !== '') {
      onSelect(selectedStand as number);
      handleClose();
    }
  };

  const isError = hasAttemptedSubmit && selectedStand === '';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: 'center' }}>בחירת עמדת הצבעה</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle1" gutterBottom sx={{ mb: 2, textAlign: 'center' }}>
          בחר עמדת הצבעה עבור {memberName}
        </Typography>
        <FormControl fullWidth error={isError}>
          <InputLabel id="voting-stand-select-label">עמדת הצבעה</InputLabel>
          <Select
            labelId="voting-stand-select-label"
            id="voting-stand-select"
            value={selectedStand}
            label="עמדת הצבעה"
            onChange={e => setSelectedStand(e.target.value as number)}
          >
            {votingStands.map(standId => (
              <MenuItem key={standId} value={standId}>
                עמדה {standId}
              </MenuItem>
            ))}
          </Select>
          {isError && <FormHelperText>יש לבחור עמדת הצבעה</FormHelperText>}
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button onClick={handleClose} variant="outlined">
          ביטול
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          שלח להצבעה
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SelectVotingStandDialog;
