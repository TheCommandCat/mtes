import {
  WSServerEmittedEvents,
  WSClientEmittedEvents,
  WSInterServerEvents,
} from '@mtes/types';
import { handleLoadRound, handleLoadVotingMember, handleVoteProcessed, handleVoteSubmitted } from './handlers';
import { AuthenticatedSocket } from '../../types/socket'; // Import AuthenticatedSocket
import { ObjectId } from 'mongodb'; // Import ObjectId

const websocket = (
  socket: AuthenticatedSocket // Use AuthenticatedSocket
) => {
  const namespace = socket.nsp;
  console.log(`🔌 WS: New connection attempt from socket ID: ${socket.id}`);

  const eventIdString = socket.handshake.query.eventId;

  if (!eventIdString || typeof eventIdString !== 'string') {
    console.error(`🚫 WS: Connection from ${socket.id} rejected. Event ID is missing or invalid in handshake query.`);
    socket.disconnect(true); // true for immediate disconnect
    return;
  }

  let eventIdObjectId: ObjectId;
  try {
    eventIdObjectId = new ObjectId(eventIdString);
  } catch (error) {
    console.error(`🚫 WS: Connection from ${socket.id} rejected. Event ID "${eventIdString}" is not a valid ObjectId. Error: ${error.message}`);
    socket.disconnect(true);
    return;
  }

  // Store eventId on the socket object (using string for room name and easy access)
  socket.eventId = eventIdString; 
  // If you also need ObjectId version frequently on socket:
  // socket.eventIdObjectId = eventIdObjectId;

  socket.join(eventIdString);
  console.log(`✅ WS: Socket ${socket.id} connected and joined room for Event ID: ${eventIdString}`);

  socket.on('ping', callback => {
    console.log(`🔔 WS: Ping from ${socket.id} in event ${socket.eventId}`);
    callback({ ok: true });
  });

  // Pass the socket itself to handlers, so they can access socket.eventId
  socket.on('loadVotingMember', (...args) => handleLoadVotingMember(namespace, socket, ...args));

  socket.on('loadRound', (...args) => handleLoadRound(namespace, socket, ...args));

  socket.on('voteSubmitted', ((...args) => {
    handleVoteSubmitted(namespace, socket, ...args);
  }));

  socket.on('voteProcessed', ((...args) => {
    handleVoteProcessed(namespace, socket, ...args);
  }));

  socket.on('disconnect', (reason) => {
    console.log(`❌ WS: Socket ${socket.id} (Event ID: ${socket.eventId || 'N/A'}) disconnected. Reason: ${reason}`);
  });
};

export default websocket;
