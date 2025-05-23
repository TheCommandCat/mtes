import { ObjectId, Filter, WithId } from 'mongodb';
import { User, SafeUser } from '@mtes/types';
import db from '../database';

export const getEventUsersWithCredentials = () => {
  return db.collection<User>('users').find().toArray();
};

export const getEventUsers = (): Promise<Array<WithId<SafeUser>>> => {
  return getEventUsersWithCredentials().then(users => {
    return users.map(user => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, lastPasswordSetDate, ...safeUser } = user;
      return safeUser as WithId<SafeUser>;
    });
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
