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
  IconButton,
  Box
} from '@mui/material';
import { FieldArray, Field, FormikValues, getIn } from 'formik';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'; // Icon for the move button
import FormikTextField from '../general/forms/formik-text-field';
import { enqueueSnackbar } from 'notistack';
import { FormValues } from '../../pages/admin'; // Adjust path as necessary

interface MembersManagementFormProps {
  title: string;
  membersFieldName: 'regularMembers' | 'mmMembers';
  values: FormValues;
  errors: any; // Consider using a more specific type for errors
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  renderActionButtons: (() => JSX.Element) | null;
  isMMList: boolean; // True if this form is for MM members
}

const MembersManagementForm: React.FC<MembersManagementFormProps> = ({
  title,
  membersFieldName,
  values,
  errors,
  setFieldValue,
  renderActionButtons,
  isMMList
}) => {
  const membersList = getIn(values, membersFieldName) || [];
  const membersErrors = getIn(errors, membersFieldName);

  const handleMoveMember = (index: number) => {
    const memberToMove = { ...membersList[index] };
    const currentList = [...membersList];
    currentList.splice(index, 1); // Remove from current list

    if (isMMList) {
      // Moving from MM to Regular
      const currentRegularMembers = values.regularMembers || [];
      setFieldValue(membersFieldName, currentList); // Update current (MM) list
      setFieldValue('regularMembers', [...currentRegularMembers, memberToMove]);
      enqueueSnackbar(`החבר "${memberToMove.name}" הועבר לרשימת נציגים.`, { variant: 'info' });
    } else {
      // Moving from Regular to MM
      const currentMMMembers = values.mmMembers || [];
      setFieldValue(membersFieldName, currentList); // Update current (Regular) list
      setFieldValue('mmMembers', [...currentMMMembers, memberToMove]);
      enqueueSnackbar(`החבר "${memberToMove.name}" הועבר לרשימת ממלאי מקום.`, { variant: 'info' });
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {typeof membersErrors === 'string' && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {membersErrors}
        </Typography>
      )}
      <FieldArray name={membersFieldName}>
        {({ remove, push }) => (
          <>
            {membersList.map((_member: any, index: number) => (
              <Grid container spacing={1} key={index} sx={{ mb: 2 }} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <FormikTextField
                    name={`${membersFieldName}.${index}.name`}
                    label="שם חבר"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth>
                    <InputLabel id={`city-select-label-${membersFieldName}-${index}`}>
                      מוסד שולח
                    </InputLabel>
                    <Field
                      as={Select}
                      name={`${membersFieldName}[${index}].city`}
                      labelId={`city-select-label-${membersFieldName}-${index}`}
                      label="מוסד שולח"
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
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SwapHorizIcon />}
                    onClick={() => handleMoveMember(index)}
                    fullWidth
                  >
                    {isMMList ? 'העבר לנציג' : 'העבר למ"מ'}
                  </Button>
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
              {isMMList ? 'הוסף ממלא מקום' : 'הוסף נציג'}
            </Button>
          </>
        )}
      </FieldArray>
      {renderActionButtons && renderActionButtons()}
    </Paper>
  );
};

export default MembersManagementForm;
