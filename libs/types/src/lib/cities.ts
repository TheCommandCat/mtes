// export const MemberCities = ['Tel Aviv - Yafo', 'Petah Tikva', 'Ramat Gan'] as const;
export const MemberCities = ['תל אביב יפו', 'פתח תקווה', 'רמת גן'] as const;
export type Cities = (typeof MemberCities)[number];
