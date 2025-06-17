export const Position = [
  'יו"ר',
  'סיו"ר',
  'מזכ"ל',
  'דובר.ת',
  'יו"ר הוועדה האתית משפטית',
  'יו"ר וועדת נו"ק',
  'מבקר.ת',
  'נציג ארצי'
] as const;
export type Positions = (typeof Position)[number];
