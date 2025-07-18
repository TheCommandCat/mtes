import { ElectionState } from '@mtes/types';
import db from '../database';
import { ObjectId } from 'mongodb';

export const getElectionState = () => {
  return db.collection<ElectionState>('election-state').findOne();
};

export const addElectionState = (state: ElectionState) => {
  return db.collection<ElectionState>('election-state').insertOne(state);
};

export const updateElectionState = (newElectionState: Partial<ElectionState>, upsert = false) => {
  console.log('Updating election state', newElectionState);

  return db
    .collection<ElectionState>('election-state')
    .updateOne({}, { $set: newElectionState }, { upsert });
};

export const deleteElectionState = (eventId: ObjectId) => {
  return db.collection<ElectionState>('election-state').deleteOne({
    _id: eventId
  });
};
