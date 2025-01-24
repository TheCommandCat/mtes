import { WithId } from 'mongodb';
// import { randomString } from '@lems/utils/random';
import { Division, User, RoleTypes } from '@mtes/types';

export const getDivisionUsers = (division: WithId<Division>): User[] => {
  const users = [];

  RoleTypes.forEach(role => {
    const user: User = {
      divisionId: division._id,
      isAdmin: false,
      role: role,
      password: 'admin',
      lastPasswordSetDate: new Date()
    };

    users.push(user);
  });

  return users;
};
