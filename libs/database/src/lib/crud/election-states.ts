import { ObjectId } from 'mongodb';
import { ElectionState } from '@mtes/types';
import db from '../database';

export const getEventState = (eventId: ObjectId) => {
  return db.collection<ElectionState>('election-state').findOne({ eventId: eventId });
};

export const addEventState = (state: ElectionState) => {
  return db.collection<ElectionState>('election-state').insertOne(state);
};

export const updateEventState = (eventId: ObjectId, newEventState: Partial<ElectionState>, upsert = false) => {
  console.log('Updating event state for event ID:', eventId, newEventState);

  return db
    .collection<ElectionState>('election-state')
    .updateOne({ eventId: eventId }, { $set: newEventState }, { upsert });
};

export const deleteEventState = (eventId: ObjectId) => {
  return db.collection<ElectionState>('election-state').deleteOne({ eventId: eventId });
};
