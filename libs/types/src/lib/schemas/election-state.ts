import { WithId } from 'mongodb';
import { AudienceDisplayScreen } from '../constants';
import { Round } from './round';
import { Member } from './member';

export interface ElectionState {
  activeRound: WithId<Round>;
  audienceDisplay: { display: AudienceDisplayScreen; round?: WithId<Round>; member?: WithId<Member> };
  completed: boolean;
}
