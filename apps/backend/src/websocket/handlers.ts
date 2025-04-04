import { Member } from '@mtes/types';
import * as db from '@mtes/database';
import { ObjectId } from 'mongodb';

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
};

export const handleLoadRound = async (namespace: any, roundId: string, callback) => {
  console.log('🔌 WS: Load round', roundId);
  console.log('WS Status: ', namespace.connected);

  const round = await db.getRound({ _id: new ObjectId(roundId) });

  if (!round) {
    console.error('Round not found:', roundId);
    callback({ ok: false, error: 'Round not found' });
    return;
  }

  try {
    await db.updateElectionState({ activeRound: round });
    console.log('✅ Loaded', round.name);
    namespace.emit('roundLoaded', round);
    callback({ ok: true });
  } catch (error) {
    console.error('⛔Error loading round:', error);
    callback({ ok: false, error: 'Failed to load round' });
  }
};
