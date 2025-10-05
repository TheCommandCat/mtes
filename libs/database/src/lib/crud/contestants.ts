import { Filter, ObjectId } from 'mongodb';
import { Contestant } from '@mtes/types';
import db from '../database';

export const getContestant = (filter: Filter<Contestant>) => {
  return db.collection<Contestant>('contestants').findOne(filter);
};

export const getDivisionContestants = (divisionId: ObjectId) => {
  return db.collection<Contestant>('contestants').find({ divisionId }).toArray();
};

export const addContestant = (team: Contestant) => {
  return db.collection<Contestant>('contestants').insertOne(team);
};

export const addContestants = (contestants: Array<Contestant>) => {
  return db.collection<Contestant>('contestants').insertMany(contestants);
};

export const updateContestant = (
  filter: Filter<Contestant>,
  newContestant: Partial<Contestant>,
  upsert = false
) => {
  return db
    .collection<Contestant>('contestants')
    .updateOne(filter, { $set: newContestant }, { upsert });
};

export const deleteContestant = (filter: Filter<Contestant>) => {
  return db.collection<Contestant>('contestants').deleteOne(filter);
};

export const deleteContestants = (filter: Filter<Contestant>) => {
  return db.collection<Contestant>('contestants').deleteMany(filter);
};
