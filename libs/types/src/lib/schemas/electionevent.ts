import { WithId } from 'mongodb';
import { Division, DivisionScheduleEntry } from './division';
import { EventUserAllowedRoles } from '@mtes/types';

export interface ElectionEvent {
  name: string;
  startDate: Date;
  endDate: Date;
  color?: string;
  eventUsers: Array<EventUserAllowedRoles>;
  hasState: boolean;
}

export interface DivisionWithEvent extends Division {
  event: WithId<ElectionEvent>;
}
