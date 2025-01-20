import { ObjectId } from 'mongodb';
import { Role } from '../roles';

export interface User {
  username?: string;
  isAdmin: boolean;
  eventId?: ObjectId;
  role?: Role;
  password: string;
}