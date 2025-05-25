import { WithId } from 'mongodb';
import { Division } from './division';
import { EventUserAllowedRoles } from '@mtes/types';

export interface ElectionEvent {
  name: string;
  startDate: Date;
  endDate: Date;
  color?: string;
  eventUsers: Array<EventUserAllowedRoles>;
  votingStands: number;
  hasState: boolean;
  electionThreshold?: number;
}

export interface DivisionWithEvent extends Division {
  event: WithId<ElectionEvent>;
}
