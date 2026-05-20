import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

import authRoutes from './routes/auth.routes';
import testRoutes from './routes/test.routes';
import alertRoutes from './routes/alert.routes';
import districtRoutes from './routes/district.routes';
import stockRoutes from './routes/stock.routes';
import deliveryRoutes from './routes/delivery.routes';
import routeRoutes from './routes/route.routes';
import { scoreRouter, householdRouter } from './routes/household.routes';
import userRoutes from './routes/user.routes';
import { publicStatus } from './controllers/user.controller';

import volunteerRoutes from './routes/volunteer.routes';
import incidentRoutes from './routes/incident.routes';
import radioRoutes from './routes/radio.routes';
import notificationRoutes from './routes/notification.routes';
import dashboardRoutes from './routes/dashboard.routes';
import aiRoutes from './routes/ai.routes';

const app = express();

// ─── HTTP SERVER + SOCKET.IO ──────────────────────────────────────────────────
// wrap Express in an http.Server so socket.io can share the same port

export const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  },
  // path stays default (/socket.io) — no conflict with /api routes
});

io.on('connection', (socket) => {
  // client sends their JWT role on connect so we can scope events if needed
  // for now all authenticated clients receive all broadcast events
  socket.on('disconnect', () => {});
});

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// ─── SWAGGER ──────────────────────────────────────────────────────────────────
const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    system: 'REMA - Rapid Emergency Medical Access',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── PUBLIC STATUS (no auth required) ────────────────────────────────────────
app.get('/api/status', publicStatus);

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/alert', alertRoutes);
app.use('/api/score', scoreRouter);
app.use('/api/households', householdRouter);
app.use('/api/stock', stockRoutes);
app.use('/api/districts', districtRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/route', routeRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/radio', radioRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);

// ─── 404 FALLBACK ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;