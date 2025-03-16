import { Socket } from 'socket.io';
import {
  WSServerEmittedEvents,
  WSClientEmittedEvents,
  WSInterServerEvents,
  WSSocketData
} from '@mtes/types';
import { handleLoadVotingMember } from './handlers';

const websocket = (
  socket: Socket<WSClientEmittedEvents, WSServerEmittedEvents, WSInterServerEvents, WSSocketData>
) => {
  console.log(`🔌 WS: New connection established`);

  socket.on('ping', callback => {
    callback({ ok: true });
  });

  socket.on('disconnect', () => {
    console.log(`❌ WS: Disconnection`);
  });
};

export default websocket;
