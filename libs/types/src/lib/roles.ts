import { ObjectId } from 'mongodb';

export const RoleTypes = [
  'voting-stand',
  'election-manager',
] as const;
export type Role = (typeof RoleTypes)[number];
