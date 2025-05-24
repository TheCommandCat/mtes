import { ObjectId, Filter, WithId, Collection } from 'mongodb';
import { User, SafeUser, ElectionEvent } from '@mtes/types';
import db from '../database';

const getElectionEventsCollection = (): Collection<ElectionEvent> => {
  return db.collection<ElectionEvent>('election-events');
};

export const getEventUsersWithCredentials = async (eventId: ObjectId): Promise<Array<WithId<User>>> => {
  const electionEventsCollection = getElectionEventsCollection();
  const event = await electionEventsCollection.findOne({ _id: eventId });

  if (!event) {
    return [];
  }

  return db.collection<User>('users').find({ role: { $in: event.eventUsers } }).toArray();
};

export const getEventUsers = async (eventId: ObjectId): Promise<Array<WithId<SafeUser>>> => {
  const users = await getEventUsersWithCredentials(eventId);
  return users.map(user => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, lastPasswordSetDate, ...safeUser } = user;
    return safeUser as WithId<SafeUser>;
  });
};

export const getUserWithCredentials = (filter: Filter<User>) => {
  return db.collection<User>('users').findOne(filter);
};

export const getUser = (filter: Filter<User>): Promise<WithId<SafeUser> | null> => {
  return getUserWithCredentials(filter).then(user => {
    if (!user) return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, lastPasswordSetDate, ...safeUser } = user;
    return safeUser as WithId<SafeUser>;
  });
};

export const addUser = (user: User) => {
  return db.collection<User>('users').insertOne(user);
};

export const addUsers = (users: Array<User>) => {
  return db.collection<User>('users').insertMany(users);
};

export const updateUser = (filter: Filter<User>, newUser: Partial<User>, upsert = false) => {
  return db.collection<User>('users').updateOne(filter, { $set: newUser }, { upsert });
};

export const deleteUser = (filter: Filter<User>) => {
  return db.collection<User>('users').deleteOne(filter);
};

export const deleteUsers = (filter: Filter<User>) => {
  return db.collection<User>('users').deleteMany(filter);
};
