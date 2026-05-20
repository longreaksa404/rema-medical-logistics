import dotenv from 'dotenv';
dotenv.config();

import { httpServer } from './app';

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`REMA backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Swagger docs: http://localhost:${PORT}/api/docs`);
  console.log(`WebSocket: ws://localhost:${PORT}/socket.io`);
});