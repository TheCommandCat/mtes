import React from 'react';
import {
  Paper,
  Typography,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  IconButton
} from '@mui/material';
import { FieldArray, Field, FormikValues } from 'formik';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FormikTextField from '../general/forms/formik-text-field';
import { enqueueSnackbar } from 'notistack';
import { FormValues } from '../../pages/admin'; // Adjust path as necessary

interface MembersManagementFormProps {
  values: FormValues;
  errors: any; // Consider using a more specific type for errors
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  renderActionButtons: () => JSX.Element;
}

const MembersManagementForm: React.FC<MembersManagementFormProps> = ({
  values,
  errors,
  setFieldValue,
  renderActionButtons
}) => {
  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        ניהול חברים
      </Typography>
      {typeof errors.members === 'string' && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {errors.members}
        </Typography>
      )}
      <FieldArray name="members">
        {({ remove, push }) => (
          <>
            {values.members.map((_member, index) => (
              <Grid container spacing={2} key={index} sx={{ mb: 2 }} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <FormikTextField name={`members.${index}.name`} label="שם חבר" fullWidth />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth>
                    <InputLabel id={`city-select-label-${index}`}>עיר</InputLabel>
                    <Field
                      as={Select}
                      name={`members[${index}].city`}
                      labelId={`city-select-label-${index}`}
                      label="עיר"
                      required
                    >
                      {values.cities.map(city => (
                        <MenuItem key={city.name} value={city.name}>
                          {city.name}
                        </MenuItem>
                      ))}
                    </Field>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={_member.isMM || false}
                        onChange={e => {
                          const newIsMM = e.target.checked;
                          let finalIsMM = newIsMM;

                          if (newIsMM === false) {
                            const cityOfMember = values.members[index].city;
                            const cityConfig = values.cities.find(c => c.name === cityOfMember);
                            const maxVotersForCity = cityConfig ? cityConfig.numOfVoters : 0;

                            let otherNonMMCountInCity = 0;
                            values.members.forEach((m, idx) => {
                              if (idx !== index && m.city === cityOfMember && !m.isMM) {
                                otherNonMMCountInCity++;
                              }
                            });

                            if (otherNonMMCountInCity + 1 > maxVotersForCity) {
                              finalIsMM = true;
                              enqueueSnackbar(
                                `הגעת למכסת הנציגים המקסימלית (${maxVotersForCity}) עבור ${cityOfMember}. החבר "${values.members[index].name}" סומן כממלא מקום.`,
                                { variant: 'warning' }
                              );
                            }
                          }
                          setFieldValue(`members[${index}].isMM`, finalIsMM);
                        }}
                      />
                    }
                    label={_member.isMM ? 'מ"מ' : 'נציג'}
                    sx={{ justifyContent: 'flex-start' }}
                  />
                </Grid>
                <Grid item xs={12} sm={2} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                  <IconButton onClick={() => remove(index)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            <Button
              startIcon={<AddIcon />}
              onClick={() =>
                push({
                  name: '',
                  city: values.cities[0]?.name || ''
                })
              }
              variant="outlined"
            >
              הוסף חבר
            </Button>
          </>
        )}
      </FieldArray>
      {renderActionButtons()}
    </Paper>
  );
};

export default MembersManagementForm;
