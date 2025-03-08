import { DivisionState } from '@mtes/types';
import db from '../database';

export const getDivisionState = () => {
  return db.collection<DivisionState>('division-states').findOne();
};

export const getState = () => {
  return db.collection<DivisionState>('division-states').findOne();
};

export const addDivisionState = (state: DivisionState) => {
  return db.collection<DivisionState>('division-states').insertOne(state);
};

export const updateDivisionState = (newDivisionState: Partial<DivisionState>, upsert = false) => {
  return db
    .collection<DivisionState>('division-states')
    .updateOne({ $set: newDivisionState }, { upsert });
};

export const deleteState = () => {
  return db.collection<DivisionState>('division-states').deleteOne();
};
