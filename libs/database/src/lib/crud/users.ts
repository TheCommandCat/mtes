import { ObjectId, Filter, WithId } from 'mongodb';
import { User } from '@mtes/types';
import db from '../database';


export const getEventUsers = (eventId: ObjectId): Promise<Array<WithId<User>>> => {
  return db
    .collection<User>('users')
    .find({ eventId })
    .toArray()
    .then(users => {
      return users.map(user => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...safeUser } = user;
        return safeUser as WithId<User>;
      });
    });
};

export const getUserWithCredentials = (filter: Filter<User>) => {
  return db.collection<User>('users').findOne(filter);
};

export const getUsersWithCredentials = (filter: Filter<User>) => {
  return db.collection<User>('users').find(filter).toArray();
};

export const getUser = (filter: Filter<User>): Promise<WithId<User> | null> => {
  return getUserWithCredentials(filter).then(user => {
    if (!user) return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user;
    return safeUser as WithId<User>;
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
