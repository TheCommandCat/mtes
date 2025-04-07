import { ObjectId, WithId } from 'mongodb';
import { AudienceDisplayScreen } from '../constants';
import { Positions } from '../positions';
import { Division } from './division';
import { Round } from './round';

export interface PresentationState {
  enabled: boolean;
  activeView: {
    slideIndex: number;
    stepIndex: number;
  };
}

export interface ScoreboardState {
  showCurrentMatch: false | 'timer' | 'no-timer';
  showPreviousMatch: boolean;
  showSponsors: boolean;
}

export interface AwardsPresentationState {
  awardWinnerSlideStyle: 'chroma' | 'full' | 'both';
}

export interface AudienceDisplayState {
  screen: AudienceDisplayScreen;
  message: string;
  // scoreboard: ScoreboardState;
  // awardsPresentation: AwardsPresentationState;
}

export interface ElectionState {
  activeRound: WithId<Round>;
  // audienceDisplay: AudienceDisplayState;
  completed: boolean;
}
