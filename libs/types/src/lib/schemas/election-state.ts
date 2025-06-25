import { WithId } from 'mongodb';
import { AudienceDisplayScreen } from '../constants';
import { Round } from './round';

export interface ElectionState {
  activeRound: WithId<Round>;
  audienceDisplay: { display: AudienceDisplayScreen; roundId?: string };
  completed: boolean;
}
