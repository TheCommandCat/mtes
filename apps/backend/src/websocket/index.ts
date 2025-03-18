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
  const namespace = socket.nsp;
  const name = socket.nsp.name.split('/')[2];
  console.log(`🔌 WS: New connection established to ${name}`);

  socket.on('joinRoom', (rooms, callback) => {
    console.log(`🏠 WS: Joining rooms ${rooms.toString()}`);
    socket.join(rooms);
    callback({ ok: true });
  });

  socket.on('pingRoom', callback => {
    callback({ ok: true, room: 'main' });
  });

  socket.on('loadVotingMember', (...args) => handleLoadVotingMember(namespace, ...args));

  socket.on('disconnect', () => {
    console.log(`❌ WS: Disconnection`);
  });
};

export default websocket;
