import { Role } from '@mtes/types';

export const localizedRoles: { [key in Role]: { name: string } } = {
  'election-manager': { name: 'מנהל בחירות' },
  'voting-stand': { name: 'קלפי בחירות' }
};
