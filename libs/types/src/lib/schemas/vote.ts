import { ObjectId } from 'mongodb';
import { Positions } from '../positions';

export interface Vote {
  round: ObjectId;
  role: Positions;
  contestant: ObjectId;
}

export interface VotingStatus {
  memberId: ObjectId;
  roundId: ObjectId;
  votedAt: Date;
}
