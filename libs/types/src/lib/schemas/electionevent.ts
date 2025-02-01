import { WithId } from 'mongodb';
import { Division } from './division';
import { EventUserAllowedRoles } from '@mtes/types';

export interface ElectionEvent {
  name: string;
  startDate: Date;
  endDate: Date;
  color?: string;
  salesforceId?: string;
  divisions?: Array<WithId<Division>>;
  eventUsers: Array<EventUserAllowedRoles>;
}

export interface DivisionWithEvent extends Division {
  event: WithId<ElectionEvent>;
}
