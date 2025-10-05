import { Filter, ObjectId } from 'mongodb';
import { Round } from '@mtes/types';
import db from '../database';

export const getRound = (filter: Filter<Round>) => {
  return db.collection<Round>('rounds').findOne(filter);
};

export const getRounds = (filter: Filter<Round>) => {
  return db.collection<Round>('rounds').find(filter).toArray();
};

export const addRound = (round: any) => {
  return db.collection<Round>('rounds').insertOne(round);
};

export const addRounds = (rounds: any[]) => {
  return db.collection<Round>('rounds').insertMany(rounds);
};

export const updateRound = (filter: Filter<Round>, newRound: Partial<Round>, upsert = false) => {
  return db.collection<Round>('rounds').updateOne(filter, { $set: newRound }, { upsert });
};

export const deleteRound = (filter: Filter<Round>) => {
  return db.collection<Round>('rounds').deleteOne(filter);
};

export const deleteRounds = (filter: Filter<Round>) => {
  return db.collection<Round>('rounds').deleteMany(filter);
};
