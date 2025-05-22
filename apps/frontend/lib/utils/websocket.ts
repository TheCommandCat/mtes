import { io, Manager, Socket } from 'socket.io-client';
import { WSServerEmittedEvents, WSClientEmittedEvents } from '@mtes/types';

const getWsBase = () => {
  return 'ws://localhost:3333';
};

const url = getWsBase();
const manager = new Manager(url ? url : '', {
  autoConnect: false,
  withCredentials: true
});

export const getSocket = (
  socketName: string
): Socket<WSServerEmittedEvents, WSClientEmittedEvents> => {
  return manager.socket(`/sockets/${socketName}`);
};
