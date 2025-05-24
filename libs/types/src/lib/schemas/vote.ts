import { ObjectId } from 'mongodb';
import { Positions } from '../positions';

export interface Vote {
  eventId: ObjectId;
  round: ObjectId;
  role: Positions;
  contestant: ObjectId;
}

export interface VotingStatus {
  eventId: ObjectId;
  memberId: ObjectId;
  roundId: ObjectId;
  votedAt: Date;
  signature: object;
}
