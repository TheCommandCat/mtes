import { ObjectId } from 'mongodb';
import { Role } from '../roles';

export interface User {
  eventId?: ObjectId;
  username?: string;
  isAdmin: boolean;
  role?: Role;
  password: string;
  roleAssociation?: {
    type: 'stand';
    value: number;
  };
  lastPasswordSetDate: Date;
}

export type SafeUser = Omit<User, 'password' | 'lastPasswordSetDate'>;
