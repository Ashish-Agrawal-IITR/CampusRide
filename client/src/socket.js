import { io } from 'socket.io-client';
import { getToken } from './api';

let socket = null;

export function connectSocket() {
  if (socket && socket.connected) return socket;
  const url = import.meta.env.VITE_API_URL || undefined; // proxied in dev
  socket = io(url, {
    auth: { token: getToken() },
    autoConnect: true,
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function getSocket() { return socket; }

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}
