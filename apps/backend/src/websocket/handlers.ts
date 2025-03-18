import { Member } from '@mtes/types';

export const handleLoadVotingMember = async (namespace: any, member: Member, callback) => {
  console.log('🔌 WS: Load voting member');

  // namespace.to('main').emit('');
  callback({ ok: true });
};
