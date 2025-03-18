import { useState, useEffect, useCallback, useRef } from 'react';
import { ConnectionStatus, WSEventListener, WSRoomName } from '@mtes/types';
import { getSocket } from '../lib/utils/websocket';

const MAX_RETRIES = 5;
const TIMEOUT = 800;
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;

export const useWebsocket = (
  room: WSRoomName,
  init?: (...args: any[]) => void | Promise<void>,
  wsevents?: Array<WSEventListener>
) => {
  const socket = getSocket('main');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    socket.connected ? 'connected' : 'disconnected'
  );
  const retryRef = useRef(0);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculateDelay = useCallback(() => {
    const delay = Math.min(BASE_DELAY * Math.pow(2, retryRef.current), MAX_DELAY);
    return delay;
  }, []);

  const reconnect = useCallback(() => {
    if (retryRef.current >= MAX_RETRIES) {
      console.error('Max reconnection attempts reached');
      setConnectionStatus('error');
      return;
    }

    socket.disconnect();
    retryRef.current += 1;
    const delay = calculateDelay();

    setTimeout(() => {
      setConnectionStatus(prev => (prev === 'error' ? 'error' : 'connecting'));

      socket.connect();
      socket.emit('joinRoom', room, response => {
        if (!response.ok) {
          setConnectionStatus('error');
          reconnect();
        } else {
          retryRef.current = 0;
          setConnectionStatus('connected');
        }
      });
    }, delay);
  }, [socket, calculateDelay]);

  const heartbeat = useCallback(() => {
    if (!socket.connected) return;

    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    socket
      .timeout(TIMEOUT)
      .emit('pingRoom', (error: Error | null, response: { ok: boolean; room: string }) => {
        if (error) {
          console.error('Heartbeat failed:', error);
          reconnect();
          return;
        }

        if (!response.ok) {
          console.warn('Invalid heartbeat response:', response);
          reconnect();
          return;
        }

        const delay = calculateDelay();
        heartbeatTimeoutRef.current = setTimeout(heartbeat, delay);
      });
  }, [socket, room, reconnect, calculateDelay]);

  useEffect(() => {
    return () => {
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    socket.connect();
    if (!socket.connected) setConnectionStatus('connecting');

    if (init) init();

    socket.onAny((eventName, ...args) => {
      console.log('🔽 Socket.IO Incoming:', eventName, args);
    });

      // Log all outgoing events
      const emit = socket.emit;
      socket.emit = function (this: any, ev, ...args) {
        console.log('🔼 Socket.IO Outgoing:', ev, args);
        return emit.apply(this, [ev, ...args] as any);
      };

    const onConnect = () => {
      setConnectionStatus('connected');
      heartbeat();
    };

    const onDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    socket.on('connect_error', (error: any) => {
      console.error('Connection error:', error);
      setConnectionStatus('error');
      reconnect();
    });

    if (wsevents) {
      for (const event of wsevents) {
        socket.on(event.name as any, event.handler);
      }
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error');
      socket.off('disconnect', onDisconnect);

      if (wsevents) {
        for (const event of wsevents) {
          socket.off(event.name as any, event.handler);
        }
      }

      // We don't disconnect the socket on cleanup
      // as it's the shared socket instance used across the app
      retryRef.current = 0;
      setConnectionStatus('disconnected');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { socket, connectionStatus };
};
