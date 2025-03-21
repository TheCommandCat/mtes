import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { ConnectionStatus, WSEventListener } from '@mtes/types';

const WS_URL = 'http://localhost:3333';
let socket: Socket | null = null;
const MAX_RETRIES = 5;
const TIMEOUT = 800;
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;

export const useWebsocket = (wsevents?: Array<WSEventListener>) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const retryRef = useRef(0);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  if (!socket) {
    socket = io(WS_URL, { autoConnect: false });
  }

  const calculateDelay = useCallback(() => {
    return Math.min(BASE_DELAY * Math.pow(2, retryRef.current), MAX_DELAY);
  }, []);

  const reconnect = useCallback(() => {
    if (retryRef.current >= MAX_RETRIES) {
      console.error('Max reconnection attempts reached');
      setConnectionStatus('error');
      return;
    }

    if (socket) {
      socket.disconnect();
    }

    retryRef.current += 1;
    setTimeout(() => {
      setConnectionStatus('connecting');
      socket?.connect();
    }, calculateDelay());
  }, [calculateDelay]);

  const heartbeat = useCallback(() => {
    if (!socket?.connected) return;

    heartbeatTimeoutRef.current && clearTimeout(heartbeatTimeoutRef.current);

    socket.timeout(TIMEOUT).emit('ping', (error: Error | null, response: { ok: boolean }) => {
      if (error || !response.ok) {
        console.error('Heartbeat failed:', error);
        reconnect();
        return;
      }
      heartbeatTimeoutRef.current = setTimeout(heartbeat, calculateDelay());
    });
  }, [calculateDelay, reconnect]);

  useEffect(() => {
    if (!socket) return;

    socket.connect();
    setConnectionStatus(socket.connected ? 'connected' : 'connecting');

    socket.on('connect', () => {
      setConnectionStatus('connected');
      retryRef.current = 0;
      heartbeat();
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      reconnect();
    });

    socket.on('connect_error', () => {
      setConnectionStatus('error');
      reconnect();
    });

    if (Array.isArray(wsevents)) {
      wsevents.forEach(({ name, handler }) => socket?.on(name, handler));
    }

    return () => {
      socket?.off('connect');
      socket?.off('disconnect');
      socket?.off('connect_error');
      wsevents?.forEach(({ name, handler }) => socket?.off(name, handler));
    };
  }, [heartbeat, reconnect, wsevents]);

  return { socket, connectionStatus };
};
