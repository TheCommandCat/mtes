import { WithId, AggregationCursor, Filter } from 'mongodb';
import { ElectionEvent } from '@mtes/types';
import db from '../database';

export const getElectionEvent = (filter: Filter<ElectionEvent>) => {
  return findElectionEvents(filter).next();
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

export const updateElectionEvent = (
  filter: Filter<ElectionEvent>,
  newElectionEvent: Partial<ElectionEvent>,
  upsert = false
) => {
  return db
    .collection<ElectionEvent>('election-events')
    .updateOne(filter, { $set: newElectionEvent }, { upsert });
};

export const addElectionEvent = (ElectionEvent: ElectionEvent) => {
  return db.collection<ElectionEvent>('election-events').insertOne(ElectionEvent);
};

export const deleteElectionEvent = (filter: Filter<ElectionEvent>) => {
  return db.collection<ElectionEvent>('election-events').deleteOne(filter);
};
