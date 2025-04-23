import { WithId } from 'mongodb';
import { Positions } from '../positions';
import { Member } from './member';

interface RoleConfig {
  role: Positions;
  contestants: WithId<Member>[];
  maxVotes: number;
}

export interface Round {
  name: string;
  roles: RoleConfig[];
  allowedMembers: Member[];
  startTime: Date | null;
  endTime: Date | null;
  isLocked?: boolean;
}
