import { Positions } from '../positions';
import { Member } from './member';

interface RoleConfig {
  role: Positions;
  contestants: Member[];
  maxVotes: number;
}

export interface Round {
  name: string;
  roles: RoleConfig[];
  allowedMembers: Member[];
}
