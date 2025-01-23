import { ObjectId } from 'mongodb';

export const RoleTypes = [
  'voting-stand',
  'election-manager',
] as const;
export type Role = (typeof RoleTypes)[number];

export const EventUserAllowedRoleTypes = [
  'tournament-manager',
  'pit-admin',
  'field-manager'
] as const;
export type EventUserAllowedRoles = (typeof EventUserAllowedRoleTypes)[number];