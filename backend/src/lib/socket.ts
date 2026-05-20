import { Server } from 'socket.io';
export let io: Server;
export function initSocket(server: Server) {
  io = server;
}