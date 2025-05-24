import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { ConnectionStatus, WSEventListener } from '@mtes/types';

const WS_URL = 'http://localhost:3333'; // Ensure this is your actual WebSocket server URL
// socket is now a state variable within the hook instance to avoid sharing across hook usages.
// let socket: Socket | null = null; 
const MAX_RETRIES = 5;
const TIMEOUT = 800;
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;

export const useWebsocket = (eventId: string | null, wsevents?: Array<WSEventListener>) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const retryRef = useRef(0);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectedEventIdRef = useRef<string | null>(null);

  const calculateDelay = useCallback(() => {
    return Math.min(BASE_DELAY * Math.pow(2, retryRef.current), MAX_DELAY);
  }, []);

  // Reconnect logic will use the existing socket instance which has query params
  const reconnect = useCallback(() => {
    if (!socket) { // No socket instance to reconnect
        setConnectionStatus('disconnected');
        return;
    }
    if (retryRef.current >= MAX_RETRIES) {
      console.error(`WS: Max reconnection attempts reached for event ${connectedEventIdRef.current || 'N/A'}`);
      setConnectionStatus('error');
      return;
    }

    // The existing socket instance already has the query params from its initialization.
    // We just need to ensure it's disconnected before trying to connect again.
    if (socket.connected) {
        socket.disconnect();
    }
    
    retryRef.current += 1;
    console.log(`WS: Attempting to reconnect for event ${connectedEventIdRef.current || 'N/A'}, attempt ${retryRef.current}...`);
    setTimeout(() => {
      setConnectionStatus('connecting');
      socket.connect();
    }, calculateDelay());
  }, [calculateDelay, socket]);

  const heartbeat = useCallback(() => {
    if (!socket?.connected) return;

    heartbeatTimeoutRef.current && clearTimeout(heartbeatTimeoutRef.current);

    socket.timeout(TIMEOUT).emit('ping', (error: Error | null, response: { ok: boolean }) => {
      if (error || !response.ok) {
        console.error(`WS: Heartbeat failed for event ${connectedEventIdRef.current}:`, error);
        reconnect();
        return;
      }
      // console.log(`WS: Heartbeat success for event ${connectedEventIdRef.current}`);
      heartbeatTimeoutRef.current = setTimeout(heartbeat, calculateDelay());
    });
  }, [calculateDelay, reconnect, socket]);

  useEffect(() => {
    if (eventId) {
      // If eventId changes or socket doesn't exist for the current eventId
      if (!socket || connectedEventIdRef.current !== eventId) {
        console.log(`WS: EventId changed or socket not initialized. New eventId: ${eventId}, Old: ${connectedEventIdRef.current}`);
        if (socket) {
          console.log(`WS: Disconnecting old socket for event ${connectedEventIdRef.current}`);
          socket.disconnect();
          // Clear old listeners from the previous socket instance before setting a new one.
          socket.off('connect');
          socket.off('disconnect');
          socket.off('connect_error');
          wsevents?.forEach(({ name, handler }) => socket.off(name, handler));
        }

        console.log(`WS: Initializing new socket for event ${eventId}`);
        const newSocket = io(WS_URL, {
          autoConnect: false, // We will connect manually
          query: { eventId },
          // Consider adding reconnectionAttempts: MAX_RETRIES here directly
          // reconnectionDelay: calculateDelay(), // This might be complex to sync with manual retries
        });
        
        setSocket(newSocket);
        connectedEventIdRef.current = eventId;
        setConnectionStatus('connecting');
        console.log(`WS: Connecting to event ${eventId}...`);
        newSocket.connect();
      } else if (!socket.connected && connectionStatus !== 'connecting') {
        // If socket exists for the current eventId but is not connected and not already trying to connect
        console.log(`WS: Socket for event ${eventId} exists but not connected. Attempting to connect.`);
        setConnectionStatus('connecting');
        socket.connect();
      }
    } else { // eventId is null
      if (socket) {
        console.log(`WS: eventId is null. Disconnecting socket for event ${connectedEventIdRef.current}`);
        socket.disconnect();
        // Clear old listeners
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        wsevents?.forEach(({ name, handler }) => socket.off(name, handler));
        setSocket(null);
        connectedEventIdRef.current = null;
      }
      setConnectionStatus('disconnected');
    }

    // This effect should also handle cleanup when the component unmounts or eventId/wsevents change
    // The current socket instance (if any) needs its listeners cleaned up
    // This return function will be for the *new* socket instance if one was created
    const currentSocketInstance = socket; // Capture the socket instance at the time of effect execution
    return () => {
      if (currentSocketInstance) {
        // console.log(`WS: Cleaning up main effect for socket of event ${connectedEventIdRef.current}`);
        // Disconnect on component unmount if we don't want to persist connection
        // currentSocketInstance.disconnect(); 
        // setSocket(null);
        // connectedEventIdRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [eventId]); // Main effect depends on eventId to re-init/disconnect


  // Effect for handling socket event listeners (connect, disconnect, custom)
  useEffect(() => {
    if (!socket) {
      return;
    }
    
    // Clear any existing listeners before attaching new ones to prevent duplicates on re-renders
    socket.removeAllListeners();


    socket.on('connect', () => {
      console.log(`WS: Connected successfully to event ${connectedEventIdRef.current}`);
      setConnectionStatus('connected');
      retryRef.current = 0; // Reset retries on successful connection
      heartbeat();
    });

    socket.on('disconnect', (reason) => {
      console.log(`WS: Disconnected from event ${connectedEventIdRef.current}. Reason: ${reason}`);
      setConnectionStatus('disconnected');
      if (reason !== 'io client disconnect') { // Don't auto-reconnect if explicitly disconnected by client
        // Reconnect logic might be triggered here if desired for other disconnect reasons
        // For now, rely on eventId change or manual reconnection attempts if needed
        // reconnect(); // Be cautious with this, could lead to loops if server keeps disconnecting
      }
      heartbeatTimeoutRef.current && clearTimeout(heartbeatTimeoutRef.current);
    });

    socket.on('connect_error', (err) => {
      console.error(`WS: Connection error for event ${connectedEventIdRef.current}: ${err.message}`);
      setConnectionStatus('error');
      // Reconnect logic is often placed here
      reconnect(); 
    });

    if (Array.isArray(wsevents)) {
      wsevents.forEach(({ name, handler }) => {
        // console.log(`WS: Registering event listener for '${name}' for event ${connectedEventIdRef.current}`);
        socket.on(name, handler);
      });
    }

    return () => {
      // console.log(`WS: Cleaning up listeners for event ${connectedEventIdRef.current}`);
      // removeAllListeners is aggressive, but ensures cleanup.
      // Alternatively, manually remove each:
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      wsevents?.forEach(({ name, handler }) => socket.off(name, handler));
      heartbeatTimeoutRef.current && clearTimeout(heartbeatTimeoutRef.current);
    };
  }, [socket, wsevents, heartbeat, reconnect]); // This effect depends on the socket instance and wsevents

  return { socket, connectionStatus };
};
