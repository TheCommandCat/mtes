import { User } from '@mtes/types';
import { ObjectId } from 'mongodb';

const randomString = (length: number) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const CreateVotingStandUsers = (numOfStands: number, eventId: ObjectId): User[] => {
  const users: User[] = [];

  users.push({
    eventId: eventId,
    isAdmin: false,
    role: 'election-manager',
    password: randomString(4),
    lastPasswordSetDate: new Date()
  });

  for (let i = 1; i <= numOfStands; i++) {
    users.push({
      eventId: eventId,
      isAdmin: false,
      role: 'voting-stand',
      password: randomString(4),
      lastPasswordSetDate: new Date(),
      roleAssociation: {
        type: 'stand',
        value: i
      }
    });
  }

  users.push({
    eventId: eventId,
    isAdmin: false,
    role: 'audience-display',
    password: randomString(4),
    lastPasswordSetDate: new Date()
  });

  return users;
};
