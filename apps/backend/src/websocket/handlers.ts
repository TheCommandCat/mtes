import { Member } from '@mtes/types';
export const handleLoadVotingMember = async (namespace: any, member: Member, callback) => {
  console.log('🔌 WS: Load voting member');
  console.log('WS Status: ', namespace.connected);

  try {
    namespace.emit('votingMemberLoaded', member);
    callback({ ok: true });
  } catch (error) {
    console.error('Error loading voting member:', error);
    callback({ ok: false, error: 'Failed to load voting member' });
  }
  callback({ ok: true });
};
