export const Position = ['יו"ר', 'סיו"ר', 'מזכ"ל'] as const;
export type Positions = (typeof Position)[number];
