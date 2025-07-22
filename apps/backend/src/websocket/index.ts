import { Namespace, Socket } from 'socket.io';
import { WSServerEmittedEvents, WSClientEmittedEvents, WSInterServerEvents } from '@mtes/types';
import {
  handleLoadRound,
  handleLoadVotingMember,
  handleUpdateAudienceDisplay,
  handleUpdateMemberPresence,
  handleVoteProcessed,
  handleVoteSubmitted
} from './handlers';

const websocket = (
  socket: Socket<WSClientEmittedEvents, WSServerEmittedEvents, WSInterServerEvents>
) => {
  const namespace = socket.nsp;
  console.log(`🔌 WS: New connection established`);

  socket.on('ping', callback => {
    callback({ ok: true });
  });

  socket.on('updateMemberPresence', (...args) => {
    handleUpdateMemberPresence(namespace, ...args);
  });

  socket.on('loadVotingMember', (...args) => handleLoadVotingMember(namespace, ...args));

  socket.on('loadRound', (...args) => handleLoadRound(namespace, ...args));

  socket.on('updateAudienceDisplay', (view, callback) => {
    handleUpdateAudienceDisplay(namespace, view, callback);
  });

  socket.on('voteSubmitted', (...args) => {
    handleVoteSubmitted(namespace, ...args);
  });

  socket.on('voteProcessed', (...args) => {
    handleVoteProcessed(namespace, ...args);
  });

  socket.on('disconnect', () => {
    console.log(`❌ WS: Disconnection`);
  });
};

export default websocket;
