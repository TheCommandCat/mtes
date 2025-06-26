import React, { useState } from 'react';
import { Paper, Typography, Stack, TextField, Button, Grid, IconButton } from '@mui/material';
import { FieldArray, FormikValues } from 'formik';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FormikTextField from '../general/forms/formik-text-field';
import { enqueueSnackbar } from 'notistack';
import { FormValues } from '../../pages/admin'; // Adjust path as necessary
import { City } from '@mtes/types'; // Adjust path as necessary

interface CitiesManagementFormProps {
  values: FormValues;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  renderActionButtons: () => JSX.Element;
  isNewEvent: boolean;
  initCities: City[];
}

const CitiesManagementForm: React.FC<CitiesManagementFormProps> = ({
  values,
  setFieldValue,
  renderActionButtons,
  isNewEvent,
  initCities
}) => {
  const [newCityName, setNewCityName] = useState('');

  const handleAddCity = () => {
    const trimmedName = newCityName.trim();
    if (trimmedName && !values.cities.some(c => c.name === trimmedName)) {
      setFieldValue('cities', [...values.cities, { name: trimmedName, numOfVoters: 0 }]);
      setNewCityName('');
    } else if (!trimmedName) {
      enqueueSnackbar('שם המוסד השולח אינו יכול להיות ריק.', {
        variant: 'warning'
      });
    } else {
      enqueueSnackbar('מוסד שולח עם שם זה כבר קיים.', {
        variant: 'info'
      });
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        ניהול ערים
      </Typography>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="שם מוסד שולח חדשה"
          value={newCityName}
          onChange={e => setNewCityName(e.target.value)}
          onKeyPress={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddCity();
            }
          }}
        />
        <Button onClick={handleAddCity} variant="contained" startIcon={<AddIcon />}>
          הוסף מוסד שולח
        </Button>
      </Stack>
      <FieldArray name="cities">
        {cityFieldArrayHelpers => (
          <>
            {values.cities.map((city, index) => (
              <Paper key={index} elevation={2} sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={5}>
                    <FormikTextField
                      name={`cities[${index}].name`}
                      label="שם מוסד שולח"
                      fullWidth
                      disabled={!isNewEvent && initCities.some(c => c.name === city.name)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <FormikTextField
                      name={`cities[${index}].numOfVoters`}
                      label="מספר מצביעים"
                      type="number"
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={2} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                    <IconButton
                      onClick={() => cityFieldArrayHelpers.remove(index)}
                      color="error"
                      disabled={!isNewEvent && initCities.some(c => c.name === city.name)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </>
        )}
      </FieldArray>
      {renderActionButtons()}
    </Paper>
  );
};

export default CitiesManagementForm;
