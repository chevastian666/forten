import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppDispatch } from './useAppDispatch';
import { addEvent } from '../store/eventSlice';

let socket: Socket | null = null;

export const useSocket = (buildingId?: string) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!socket) {
      socket = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
        withCredentials: true,
      });

      socket.on('connect', () => {
        console.log('Connected to WebSocket server');
      });

      socket.on('event', (event) => {
        dispatch(addEvent(event));
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
      });
    }

    if (buildingId) {
      socket.emit('subscribe', buildingId);
      
      return () => {
        socket?.emit('unsubscribe', buildingId);
      };
    }
  }, [buildingId, dispatch]);

  return socket;
};