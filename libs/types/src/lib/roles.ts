import { ObjectId } from 'mongodb';

export const RoleTypes = ['election-manager', 'voting-stand'] as const;
export type Role = (typeof RoleTypes)[number];

export const RoleAssociationTypes = ['room', 'table', 'category', 'section'] as const;
export type RoleAssociationType = (typeof RoleAssociationTypes)[number];

export const getAssociationType = (role: Role): RoleAssociationType | undefined => {
  return undefined;
};

export type RoleAssociation = { type: RoleAssociationType; value: string | ObjectId };

export const EventUserAllowedRoleTypes = ['election-manager', 'voting-stand'] as const;
export type EventUserAllowedRoles = (typeof EventUserAllowedRoleTypes)[number];
