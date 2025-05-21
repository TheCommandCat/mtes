import React, { useState, useEffect } from 'react';
import { Role, SafeUser } from '@mtes/types';

const ensureArray = (value: any | Array<any>, allowNull = false) => {
  if ((!allowNull && value === null) || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

const partialMatch = <T,>(partial: Partial<T>, full: T): boolean => {
  return Object.keys(partial).every(
    key => JSON.stringify(partial[key as keyof T]) === JSON.stringify(full[key as keyof T])
  );
};

interface RoleAuthorizerProps {
  user: SafeUser;
  allowedRoles?: Role | Array<Role>;
  conditionalRoles?: Role | Array<Role>;
  conditions?: Partial<SafeUser>;
  onFail?: () => void;
  children?: React.ReactNode;
}

export const RoleAuthorizer: React.FC<RoleAuthorizerProps> = ({
  user,
  allowedRoles,
  conditionalRoles,
  conditions,
  onFail,
  children
}) => {
  if (!allowedRoles && !conditionalRoles) {
    throw new Error('You must specify either allowed or conditional rows');
  }
  if (conditionalRoles && !conditions) {
    throw new Error("You speficied conditional roles, but you didn't specify conditions");
  }

  const allowedRoleArray: Array<Role> = ensureArray(allowedRoles);
  const conditionalRoleArray: Array<Role> = ensureArray(conditionalRoles);
  const [roleMatch, setRoleMatch] = useState(false);

  useEffect(() => {
    if ((user.role && allowedRoleArray.includes(user.role)) || user.isAdmin) {
      setRoleMatch(true);
    } else if (user.role && conditions && conditionalRoleArray.includes(user.role)) {
      if (partialMatch(conditions, user)) {
        setRoleMatch(true);
      } else {
        if (onFail != undefined) onFail();
      }
    } else {
      if (onFail != undefined) onFail();
    }
  }, []);

  return roleMatch && children;
};
