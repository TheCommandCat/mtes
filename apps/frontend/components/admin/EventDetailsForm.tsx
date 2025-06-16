import React from 'react';
import { Grid, Paper, Typography } from '@mui/material';
import FormikTextField from '../general/forms/formik-text-field';
import { FormValues } from '../../pages/admin';

interface EventDetailsFormProps {
  renderActionButtons: () => JSX.Element;
}

const EventDetailsForm: React.FC<EventDetailsFormProps> = ({ renderActionButtons }) => {
  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        פרטי אירוע
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <FormikTextField name="name" label="שם האירוע" fullWidth />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormikTextField name="votingStands" label="מספר עמדות הצבעה" type="number" fullWidth />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormikTextField
            name="electionThreshold"
            label="אחוז הכשירות (%)"
            type="number"
            fullWidth
          />
        </Grid>
      </Grid>
      {renderActionButtons()}
    </Paper>
  );
};

export default EventDetailsForm;
