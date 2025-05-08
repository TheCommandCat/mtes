import { Member } from './schemas/member';

export const STAND_STATES = ['NotStarted', 'Voting', 'VotingSubmitted', 'Empty'] as const;
export type VotingStates = (typeof STAND_STATES)[number];
export interface VotingStandStatus {
  status: VotingStates;
  member: Member | null;
}
