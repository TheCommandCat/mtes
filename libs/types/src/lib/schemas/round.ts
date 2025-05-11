import { WithId } from 'mongodb';
import { Positions } from '../positions';
import { Member } from './member';

interface RoleConfig {
  role: Positions;
  contestants: WithId<Member>[];
  maxVotes: number;
  whiteVote: boolean;
}

export interface Round {
  name: string;
  roles: RoleConfig[];
  allowedMembers: WithId<Member>[];
  startTime: Date | null;
  endTime: Date | null;
  isLocked: boolean;
}
