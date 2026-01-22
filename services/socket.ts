import io from 'socket.io-client';

// Lógica de URL más directa para Socket.IO
let SOCKET_URL: string;
const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (API_URL && API_URL.includes('mhlhomes.ddns.net')) {
  // En producción, usamos la URL específica para el socket
  SOCKET_URL = 'https://mhlhomes.ddns.net:9092';
} else {
  // En desarrollo, usamos la IP local o la que venga de las variables de entorno
  const DEV_API_URL = API_URL || 'http://192.168.100.59:8080';
  SOCKET_URL = DEV_API_URL.replace(':8080', ':9092');
}

console.log('Connecting to Socket.IO on:', SOCKET_URL);

let socket: any; // Usamos 'any' para evitar conflictos de tipos estrictos entre versiones

export const initSocket = (token: string) => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      path: '/socket.io/', // Aseguramos que la ruta termine en slash
      auth: { token },
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
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