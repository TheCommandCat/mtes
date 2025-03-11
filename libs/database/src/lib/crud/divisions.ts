import { Filter, ObjectId } from 'mongodb';
import { Division } from '@mtes/types';
import db from '../database';

export const getDivisions = (filter: Filter<Division>) => {
  return db.collection<Division>('divisions').find(filter).toArray();
};

export const getEventDivisions = (eventId: ObjectId) => {
  return db.collection<Division>('divisions').find({ eventId }).toArray();
};

export const getAllDivisions = () => {
  return db.collection<Division>('divisions').find({}).toArray();
};

export const updateDivision = (newDivision: Partial<Division>, upsert = false) => {
  return db.collection<Division>('divisions').updateOne({ $set: newDivision }, { upsert });
};

export const addDivision = (division: Division) => {
  return db.collection<Division>('divisions').insertOne(division);
};

export const deleteDivision = (filter: Filter<Division>) => {
  return db.collection<Division>('divisions').deleteOne(filter);
};
