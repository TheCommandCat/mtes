export const Position = ['Chairman', 'Secretary', 'Secretary General'] as const;
export type Positions = (typeof Position)[number];
