import { ObjectId, WithId } from 'mongodb';
import { AudienceDisplayScreen } from '../constants';
import { Round } from './round';
import { Member } from './member';

export interface ElectionState {
  eventId: ObjectId;
  activeRound: WithId<Round>;
  audienceDisplay: { display: AudienceDisplayScreen; round?: WithId<Round>; member?: WithId<Member>; message?: string };
  completed: boolean;
}
