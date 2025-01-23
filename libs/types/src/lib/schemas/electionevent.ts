import { EventUserAllowedRoles } from '../roles';

export interface ElectionEvent {
  name: string;
  startDate: Date;
  eventUsers: Array<EventUserAllowedRoles>;
}