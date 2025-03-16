import { io, Socket } from 'socket.io-client';
import { WSServerEmittedEvents, WSClientEmittedEvents } from '@mtes/types';

const getWsBase = (forceClient = false) => {
  const isSsr = !forceClient && typeof window === 'undefined';
  return 'http://localhost:3333';
  // return isSsr ? process.env.LOCAL_WS_URL : process.env.NEXT_PUBLIC_WS_URL;
};

export const getSocket = (): Socket<WSServerEmittedEvents, WSClientEmittedEvents> => {
  return io(getWsBase(), {
    autoConnect: false,
    withCredentials: true
  });
};
