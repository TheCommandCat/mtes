import { Member } from '@mtes/types';
import * as db from '@mtes/database';
import { ObjectId, WithId } from 'mongodb';

export const handleLoadVotingMember = async (
  namespace: any,
  member: WithId<Member>,
  votingStand: number,
  callback
) => {
  console.log('🔌 WS: Load voting member');
  console.log('WS Status: ', namespace.connected);

  try {
    namespace.emit('votingMemberLoaded', member, votingStand);
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

  // if (!round) {
  //   console.error('Round not found:', roundId);
  //   callback({ ok: false, error: 'Round not found' });
  //   return;
  // }

  try {
    await db.updateElectionState({ activeRound: round });

    if (round) {
      console.log('✅ Loaded round:', round.name);
    } else {
      console.log('🛑 Round stopped');
    }

    namespace.emit('roundLoaded', round);
    callback({ ok: true });
  } catch (error) {
    console.error('❌ Failed to load round:', error);
    callback({ ok: false, error: 'Failed to load round' });
  }
};

export const handleVoteSubmitted = async (
  namespace: any,
  member: WithId<Member>,
  votingStand: number,
  callback
) => {
  namespace.emit('voteSubmitted', member, votingStand);
  callback({ ok: true });
};

export const handleVoteProcessed = async (
  namespace: any,
  member: WithId<Member>,
  votingStand: number,
  callback
) => {
  namespace.emit('voteProcessed', member, votingStand);
  callback({ ok: true });
};
