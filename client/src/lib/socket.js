import { io } from 'socket.io-client'

export const createSocket = (token) => {
  return io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000', {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: false,
  })
}
