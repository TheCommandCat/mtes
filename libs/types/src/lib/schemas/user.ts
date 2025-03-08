import { ObjectId } from 'mongodb';
import { Role, RoleAssociation } from '../roles';

export interface User {
  username?: string;
  isAdmin: boolean;
  role?: Role;
  password: string;
  lastPasswordSetDate: Date;
}

export type SafeUser = Omit<User, 'password' | 'lastPasswordSetDate'>;
