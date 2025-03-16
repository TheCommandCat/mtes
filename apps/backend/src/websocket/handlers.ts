import { Member, VotingConfig } from '@mtes/types';

export const handleLoadVotingMember = async (
  votingConf: VotingConfig,
  member: Member,
  callback
) => {
  console.log('🔌 WS: Load voting member');
};
