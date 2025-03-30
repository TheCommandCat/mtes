import { Filter, ObjectId } from 'mongodb';
import { ElectionEvent } from '@mtes/types';
import db from '../database';

export const getRound = (filter: Filter<ElectionEvent>) => {
  return db.collection<ElectionEvent>('rounds').findOne(filter);
};

export const getRounds = (filter: Filter<ElectionEvent>) => {
  return db.collection<ElectionEvent>('rounds').find(filter).toArray();
};

export const addRound = (round: any) => {
  return db.collection<ElectionEvent>('rounds').insertOne(round);
};

export const addRounds = (rounds: any[]) => {
  return db.collection<ElectionEvent>('rounds').insertMany(rounds);
};

export const updateRound = (
  filter: Filter<ElectionEvent>,
  newRound: Partial<ElectionEvent>,
  upsert = false
) => {
  return db.collection<ElectionEvent>('rounds').updateOne(filter, { $set: newRound }, { upsert });
};

export const deleteRound = (filter: Filter<ElectionEvent>) => {
  return db.collection<ElectionEvent>('rounds').deleteOne(filter);
};

export const deleteRounds = () => {
  return db.collection<ElectionEvent>('rounds').deleteMany();
};
