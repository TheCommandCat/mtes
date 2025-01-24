import { ObjectId } from 'mongodb';
import { AudienceDisplayScreen } from '../constants';
import { Positions } from '../positions';
import { Division } from './division';

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

export interface DivisionState {
  divisionId: ObjectId;
  activeRound: ObjectId | null;
  currentRoundPosition: Positions | null;
  currentRound: null;
  audienceDisplay: AudienceDisplayState;
  completed: boolean;
  allowTeamExports: boolean;
}
