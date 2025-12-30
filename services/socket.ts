import io from 'socket.io-client';
import { Platform } from 'react-native';

// Usamos la misma lógica de URL que en tu api.ts o login
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.100.59:8080';

// Ajustamos el puerto para Socket.IO (9092) en lugar del de la API (8080)
const SOCKET_URL = API_URL.replace('8080', '9092');

let socket: any; // Usamos 'any' para evitar conflictos de tipos estrictos entre versiones

export const initSocket = (token: string) => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      query: { token }, // En v2, el token SIEMPRE va en query
      transports: ['websocket'], // Forzamos websocket para mejor rendimiento en mobile
      autoConnect: false,
      reconnection: true, // Habilitar reconexión automática interna
      reconnectionAttempts: Infinity, // Intentar reconectar indefinidamente
      reconnectionDelay: 1000, // Esperar 1s antes del primer intento
      reconnectionDelayMax: 5000, // Espera máxima de 5s entre intentos
      timeout: 20000, // Tiempo de espera antes de considerar error de conexión
      forceNew: true, // Fuerza una nueva conexión
      jsonp: false, // Deshabilitar JSONP
    } as any);
  }
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    // @ts-ignore
    socket = null;
  }
};