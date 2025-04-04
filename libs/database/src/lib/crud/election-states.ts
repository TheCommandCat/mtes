import { ElectionState } from '@mtes/types';
import db from '../database';

export const getElectionState = () => {
  return db.collection<ElectionState>('election-state').findOne();
};

export const addElectionState = (state: ElectionState) => {
  return db.collection<ElectionState>('election-state').insertOne(state);
};

export const updateElectionState = (newElectionState: Partial<ElectionState>, upsert = false) => {
  return db
    .collection<ElectionState>('election-state')
    .updateOne({ $set: newElectionState }, { upsert });
};

export const deleteState = () => {
  return db.collection<ElectionState>('election-state').deleteOne();
};
