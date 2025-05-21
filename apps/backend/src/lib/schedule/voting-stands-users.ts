import { User } from '@mtes/types';

const randomString = (length: number) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const CreateVotingStandUsers = (numOfStands: number): User[] => {
  const users = [];

  users.push({
    isAdmin: false,
    role: 'election-manager',
    password: 'admin', // randomString(4)
    lastPasswordSetDate: new Date()
  });

  for (let i = 1; i <= numOfStands; i++) {
    users.push({
      isAdmin: false,
      role: 'voting-stand',
      password: 'admin', // randomString(4)
      lastPasswordSetDate: new Date(),
      roleAssociation: {
        type: 'stand',
        value: i
      }
    });
  }
  return users;
};
