

export const MemberCities = ['Tel Aviv - Yafo', 'Petah Tikva', 'Ramat Gan'] as const;
export type Cities = (typeof MemberCities)[number];