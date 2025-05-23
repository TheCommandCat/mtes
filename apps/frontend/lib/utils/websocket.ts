import { io, Manager, Socket } from 'socket.io-client';
import { WSServerEmittedEvents, WSClientEmittedEvents } from '@mtes/types';

const getWsBase = (forceClient = false) => {
  const isSsr = !forceClient && typeof window === 'undefined';
  return 'http://localhost:3333';
  // return isSsr ? process.env.LOCAL_WS_URL : process.env.NEXT_PUBLIC_WS_URL;
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
