import { Filter, ObjectId } from 'mongodb';
import { Round } from '@mtes/types';
import db from '../database';

export const getRound = (filter: Filter<Round>, eventId?: ObjectId) => {
  const query = eventId ? { ...filter, eventId } : filter;
  return db.collection<Round>('rounds').findOne(query);
};

export const getRounds = (filter: Filter<Round>, eventId?: ObjectId) => {
  const query = eventId ? { ...filter, eventId } : filter;
  return db.collection<Round>('rounds').find(query).toArray();
};

export const addRound = (round: Round) => {
  return db.collection<Round>('rounds').insertOne(round);
};

export const addRounds = (rounds: Round[]) => {
  return db.collection<Round>('rounds').insertMany(rounds);
};

export const updateRound = (filter: Filter<Round>, newRound: Partial<Round>, eventId?: ObjectId, upsert = false) => {
  const query = eventId ? { ...filter, eventId } : filter;
  return db.collection<Round>('rounds').updateOne(query, { $set: newRound }, { upsert });
};

export const deleteRound = (filter: Filter<Round>, eventId?: ObjectId) => {
  const query = eventId ? { ...filter, eventId } : filter;
  return db.collection<Round>('rounds').deleteOne(query);
};

export const deleteRounds = (eventId: ObjectId) => {
  return db.collection<Round>('rounds').deleteMany({ eventId: eventId });
};
