export const STAND_STATES = ['NotStarted', 'Voting', 'VotingSubmitted', 'Empty'] as const;
export type VotingStates = (typeof STAND_STATES)[number];