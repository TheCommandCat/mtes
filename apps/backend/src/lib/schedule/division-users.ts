import { WithId } from 'mongodb';
// import { randomString } from '@lems/utils/random';
import { Division, User, RoleTypes } from '@mtes/types';

export const getDivisionUsers = (
  numOfStands: number
): User[] => {
  const users = [];

  RoleTypes.forEach(role => {
    const user: User = {
      isAdmin: false,
      role: role,
      password: 'admin',
      lastPasswordSetDate: new Date()
    };

    if (role === 'voting-stand') {
      for (let i = 0; i < numOfStands; i++) {
        const userWithAssociation = {
          ...user,
          roleAssociation: {
            type: 'stand',
            value: i + 1
          },
        };
        users.push(userWithAssociation);
      }
   } else {
      users.push(user);
    }
  });

  return users;
};
