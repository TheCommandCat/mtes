import { ObjectId } from 'mongodb';
import { Positions } from '../positions';
import { Member } from './member';
import { Round } from './round';

export interface Vote {
  round: ObjectId;
  role: Positions;
  contestant: ObjectId;
}
