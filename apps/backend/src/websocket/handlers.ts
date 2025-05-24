import { Member, ElectionState } from '@mtes/types';
import * as db from '@mtes/database';
import { ObjectId, WithId } from 'mongodb';
import { Server as SocketIOServer, Namespace } from 'socket.io';
import { AuthenticatedSocket } from '../../types/socket'; // Import AuthenticatedSocket

type CallbackFunction = (response: { ok: boolean; error?: string }) => void;

export const handleLoadVotingMember = async (
  namespace: Namespace,
  socket: AuthenticatedSocket,
  eventIdFromClient: string,
  member: WithId<Member>,
  votingStand: number,
  callback: CallbackFunction | undefined
) => {
  const eventIdFromSocket = socket.eventId;
  console.log(`🔌 WS: handleLoadVotingMember for event ${eventIdFromClient} from socket ${socket.id} (room: ${eventIdFromSocket})`);

  if (eventIdFromClient !== eventIdFromSocket) {
    console.error(`🚫 WS: Event ID mismatch for socket ${socket.id}. Client: ${eventIdFromClient}, Socket: ${eventIdFromSocket}`);
    if (typeof callback === 'function') {
      callback({ ok: false, error: 'Event ID mismatch' });
    }
    return;
  }

  try {
    // Assuming member object already contains its eventId, or it's validated elsewhere.
    // No specific DB call here, just emitting.
    namespace.to(eventIdFromSocket).emit('votingMemberLoaded', member, votingStand);
    console.log(`✅ WS: votingMemberLoaded emitted to room ${eventIdFromSocket} for member ${member._id} at stand ${votingStand}`);
    if (typeof callback === 'function') {
      callback({ ok: true });
    }
  } catch (error) {
    console.error(`❌ WS: Error in handleLoadVotingMember for event ${eventIdFromSocket}:`, error);
    if (typeof callback === 'function') {
      callback({ ok: false, error: 'Failed to load voting member' });
    }
  }
};

export const handleLoadRound = async (
  namespace: Namespace,
  socket: AuthenticatedSocket,
  eventIdFromClient: string,
  roundId: string,
  callback: CallbackFunction
) => {
  const eventIdFromSocket = socket.eventId;
  console.log(`🔌 WS: handleLoadRound for event ${eventIdFromClient}, round ${roundId} from socket ${socket.id} (room: ${eventIdFromSocket})`);

  if (eventIdFromClient !== eventIdFromSocket) {
    console.error(`🚫 WS: Event ID mismatch for socket ${socket.id}. Client: ${eventIdFromClient}, Socket: ${eventIdFromSocket}`);
    callback({ ok: false, error: 'Event ID mismatch' });
    return;
  }
  
  let eventIdObjectId: ObjectId;
  let roundObjectId: ObjectId;
  try {
    eventIdObjectId = new ObjectId(eventIdFromSocket);
    roundObjectId = new ObjectId(roundId);
  } catch (error) {
    console.error(`🚫 WS: Invalid ObjectId format for eventId "${eventIdFromSocket}" or roundId "${roundId}"`, error);
    callback({ ok: false, error: 'Invalid ID format' });
    return;
  }

  try {
    const round = await db.getRound({ _id: roundObjectId }, eventIdObjectId);
    if (!round) {
        console.log(`🛑 WS: Round ${roundId} not found for event ${eventIdFromSocket}.`);
        callback({ ok: false, error: 'Round not found for this event.' });
        return;
    }
    
    // Ensure that the round.eventId matches the eventIdFromSocket for an additional layer of security
    if (round.eventId.toString() !== eventIdFromSocket) {
        console.error(`🚫 WS: Critical - Round ${roundId} eventId ${round.eventId.toString()} does not match socket's eventId ${eventIdFromSocket}`);
        callback({ ok: false, error: 'Round event association mismatch' });
        return;
    }

    // Update the event state with the active round, scoped by eventId
    const updateStatePayload: Partial<Omit<ElectionState, 'eventId'>> = { activeRound: round };
    await db.updateEventState(eventIdObjectId, updateStatePayload);

    console.log(`✅ WS: Loaded round: ${round.name} for event ${eventIdFromSocket}. Emitting to room ${eventIdFromSocket}.`);
    namespace.to(eventIdFromSocket).emit('roundLoaded', roundId); // Emitting roundId, client can fetch if needed or use existing
    callback({ ok: true });
  } catch (error) {
    console.error(`❌ WS: Failed to load round ${roundId} for event ${eventIdFromSocket}:`, error);
    callback({ ok: false, error: 'Failed to load round' });
  }
};

export const handleVoteSubmitted = async (
  namespace: Namespace,
  socket: AuthenticatedSocket,
  eventIdFromClient: string,
  member: WithId<Member>,
  votingStand: number,
  callback: CallbackFunction | undefined
) => {
  const eventIdFromSocket = socket.eventId;
  console.log(`🔌 WS: handleVoteSubmitted for event ${eventIdFromClient} from member ${member._id} at stand ${votingStand} (socket ${socket.id}, room: ${eventIdFromSocket})`);

  if (eventIdFromClient !== eventIdFromSocket) {
    console.error(`🚫 WS: Event ID mismatch for socket ${socket.id}. Client: ${eventIdFromClient}, Socket: ${eventIdFromSocket}`);
    if (typeof callback === 'function') {
      callback({ ok: false, error: 'Event ID mismatch' });
    }
    return;
  }
  // Assuming member.eventId has been validated if it exists, or the member is confirmed to be part of this event.
  // No specific DB call here, just emitting.
  namespace.to(eventIdFromSocket).emit('voteSubmitted', member, votingStand);
  console.log(`✅ WS: voteSubmitted emitted to room ${eventIdFromSocket} for member ${member._id} at stand ${votingStand}`);
  if (typeof callback === 'function') {
    callback({ ok: true });
  }
};

export const handleVoteProcessed = async (
  namespace: Namespace,
  socket: AuthenticatedSocket,
  eventIdFromClient: string,
  member: WithId<Member>,
  votingStand: number,
  callback: CallbackFunction | undefined
) => {
  const eventIdFromSocket = socket.eventId;
  console.log(`🔌 WS: handleVoteProcessed for event ${eventIdFromClient} for member ${member._id} at stand ${votingStand} (socket ${socket.id}, room: ${eventIdFromSocket})`);

  if (eventIdFromClient !== eventIdFromSocket) {
    console.error(`🚫 WS: Event ID mismatch for socket ${socket.id}. Client: ${eventIdFromClient}, Socket: ${eventIdFromSocket}`);
    if (typeof callback === 'function') {
      callback({ ok: false, error: 'Event ID mismatch' });
    }
    return;
  }
  // Assuming member.eventId has been validated.
  // No specific DB call here, just emitting.
  namespace.to(eventIdFromSocket).emit('voteProcessed', member, votingStand);
  console.log(`✅ WS: voteProcessed emitted to room ${eventIdFromSocket} for member ${member._id} at stand ${votingStand}`);
  if (typeof callback === 'function') {
    callback({ ok: true });
  }
};
