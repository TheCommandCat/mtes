import { Socket } from 'socket.io';
import {
  WSServerEmittedEvents,
  WSClientEmittedEvents,
  WSInterServerEvents,
  WSSocketData
} from '@mtes/types';
import { handleLoadRound, handleLoadVotingMember } from './handlers';

const websocket = (
  socket: Socket<WSClientEmittedEvents, WSServerEmittedEvents, WSInterServerEvents, WSSocketData>
) => {
  const namespace = socket.nsp;
  console.log(`🔌 WS: New connection established`);

  socket.on('ping', callback => {
    callback({ ok: true });
  });

  socket.on('loadVotingMember', (...args) => handleLoadVotingMember(namespace, ...args));

  socket.on('loadRound', (...args) => handleLoadRound(namespace, ...args));

  socket.on('disconnect', () => {
    console.log(`❌ WS: Disconnection`);
  });
};

export default websocket;
