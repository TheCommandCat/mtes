import { ObjectId, WithId } from 'mongodb';
import { Positions } from '../positions';
import { Member } from './member';

interface RoleConfig {
  role: Positions;
  contestants: WithId<Member>[];
  maxVotes: number;
  numWhiteVotes: number;
  numWinners: number;
}

export interface Round {
  eventId: ObjectId;
  name: string;
  roles: RoleConfig[];
  allowedMembers: WithId<Member>[];
  startTime: Date | null;
  endTime: Date | null;
  isLocked: boolean;
}
