import { WithId, AggregationCursor, Filter, ObjectId } from 'mongodb';
import { ElectionEvent } from '@mtes/types';
import db from '../database';

export const getElectionEventById = (eventId: ObjectId) => {
  return findElectionEvents({ _id: eventId }).next();
};

export const findElectionEvents = (filter: Filter<ElectionEvent>) => {
  return db.collection<ElectionEvent>('election-events').aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'divisions',
        localField: '_id',
        foreignField: 'eventId',
        as: 'divisions'
      }
    }
  ]) as AggregationCursor<WithId<ElectionEvent>>;
};

export const getElectionEvents = (filter: Filter<ElectionEvent>) => {
  return findElectionEvents(filter).toArray();
};

export const getAllElectionEvents = () => {
  return findElectionEvents({}).toArray();
};

export const getAllActiveElectionEvents = (currentDate: Date = new Date()) => {
  return findElectionEvents({ endDate: { $gte: currentDate } }).toArray();
};

export const updateElectionEvent = (eventId: ObjectId, newElectionEvent: Partial<ElectionEvent>, upsert = false) => {
  return db
    .collection<ElectionEvent>('election-events')
    .updateOne({ _id: eventId }, { $set: newElectionEvent }, { upsert });
};

export const addElectionEvent = (electionEvent: ElectionEvent) => {
  return db.collection<ElectionEvent>('election-events').insertOne(electionEvent);
};

export const deleteElectionEvent = (eventId: ObjectId) => {
  return db.collection<ElectionEvent>('election-events').deleteOne({ _id: eventId });
};
