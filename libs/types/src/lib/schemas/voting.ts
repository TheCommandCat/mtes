import { Positions } from '../positions';
import { Member } from './member';

export interface VotingConfig {
  roles: RoleConfig[];
}

export interface RoleConfig {
  role: Positions;
  contestants: Member[];
  maxVotes: number;
}
