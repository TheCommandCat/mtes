import { Member } from '@mtes/types';

export const handleLoadVotingMember = async (socket: any, member: Member, callback) => {
  console.log('🔌 WS: Load voting member');

  // socket.emit('votingMemberLoaded', member);
  callback({ ok: true });
};
