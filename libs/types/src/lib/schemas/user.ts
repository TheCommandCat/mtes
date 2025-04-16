import { Role } from '../roles';

export interface User {
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
