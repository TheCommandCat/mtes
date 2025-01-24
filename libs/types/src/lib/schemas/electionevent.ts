import { WithId } from 'mongodb';
import { Division } from './division';

export interface ElectionEvent {
  name: string;
  startDate: Date;
  endDate: Date;
  salesforceId?: string;
  divisions?: Array<WithId<Division>>;
}