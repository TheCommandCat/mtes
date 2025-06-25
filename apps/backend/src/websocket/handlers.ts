import { Member } from '@mtes/types';
import * as db from '@mtes/database';
import { ObjectId, WithId } from 'mongodb';

export const handleLoadVotingMember = async (
  namespace: any,
  member: WithId<Member>,
  votingStand: number,
  callback: ((response: { ok: boolean; error?: string }) => void) | undefined
) => {
  console.log('🔌 WS: Load voting member');
  console.log('WS Status: ', namespace.connected);

  try {
    namespace.emit('votingMemberLoaded', member, votingStand);
    if (typeof callback === 'function') {
      callback({ ok: true });
    }
  } catch (error) {
    console.error('Error loading voting member:', error);
    if (typeof callback === 'function') {
      callback({ ok: false, error: 'Failed to load voting member' });
    }
  }
};

export const handleLoadRound = async (namespace: any, roundId: string, callback) => {
  console.log('🔌 WS: Load round', roundId);
  console.log('WS Status: ', namespace.connected);

  const round = await db.getRound({ _id: new ObjectId(roundId) });

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
  callback: ((response: { ok: boolean }) => void) | undefined
) => {
  namespace.emit('voteSubmitted', member, votingStand);
  if (typeof callback === 'function') {
    callback({ ok: true });
  }
};

export const handleVoteProcessed = async (
  namespace: any,
  member: WithId<Member>,
  votingStand: number,
  callback: ((response: { ok: boolean }) => void) | undefined
) => {
  namespace.emit('voteProcessed', member, votingStand);
  if (typeof callback === 'function') {
    callback({ ok: true });
  }
};

export const handleUpdateMemberPresence = async (
  namespace: any,
  memberId: string,
  isMM: boolean,
  isPresent: boolean,
  replacedBy: WithId<Member> | null,
  callback: ((response: { ok: boolean; error?: string }) => void) | undefined
) => {

  if (!memberId) {
    console.log('❌ Member ID is null or undefined');
    if (typeof callback === 'function') {
      callback({ ok: false, error: 'Member ID is missing' });
    }
    return;
  }

  console.log(`🔌 WS: Update member presence for ${memberId}`);
  console.log('WS Status: ', namespace.connected);

  const updatePayload: Partial<Member> = {
    isPresent,
    replacedBy: replacedBy ? replacedBy as WithId<Member> : null
  };

  try {
    if (isMM) {
      const result = await db.updateMmMember(
        { _id: new ObjectId(memberId) },
        updatePayload as unknown as Partial<Member>
      );
      if (!result.acknowledged || result.matchedCount === 0) {
        console.log(`❌ Could not update presence for member ${memberId}. Member not found or update failed.`);
        if (typeof callback === 'function') {
          callback({ ok: false, error: 'Member not found or update failed' });
        }
        return;
      }
      console.log(`✅ Presence updated for MM member ${memberId}`);
    } else {
      const result = await db.updateMember(
        { _id: new ObjectId(memberId) },
        updatePayload as unknown as Partial<Member>
      );
      if (!result.acknowledged || result.matchedCount === 0) {
        console.log(`❌ Could not update presence for member ${memberId}. Member not found or update failed.`);
        if (typeof callback === 'function') {
          callback({ ok: false, error: 'Member not found or update failed' });
        }
        return;
      }
      console.log(`✅ Presence updated for member ${memberId}`);
    }
    namespace.emit('memberPresenceUpdated',
      memberId,
      isMM,
      isPresent,
      replacedBy
    );

  } catch (error) {
    console.error('❌ Error updating member presence:', error);
    if (typeof callback === 'function') {
      callback({ ok: false, error: 'Internal server error while updating member presence' });
    }
  }
}

export const handleUpdateAudienceDisplay = async (
  namespace: any,
  view: { display: 'round' | 'presence' | 'voting'; roundId?: string },
  callback: ((response: { ok: boolean; error?: string }) => void) | undefined
) => {
  console.log(`🔌 WS: Update audience display to ${view}`);
  console.log('WS Status: ', namespace.connected);

  try {
    await db.updateElectionState({ audienceDisplay: { display: view.display, roundId: view.roundId } });
    namespace.emit('audienceDisplayUpdated', view);
    if (typeof callback === 'function') {
      callback({ ok: true });
    }
  } catch (error) {
    console.error('❌ Error updating audience display:', error);
    if (typeof callback === 'function') {
      callback({ ok: false, error: 'Failed to update audience display' });
    }
  }
}