import express from 'express';
import cors from 'cors';
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

// Chat 7
import volunteerRoutes from './routes/volunteer.routes';
import incidentRoutes from './routes/incident.routes';
import radioRoutes from './routes/radio.routes';
import notificationRoutes from './routes/notification.routes';
import dashboardRoutes from './routes/dashboard.routes';

// Chat 20
import aiRoutes from './routes/ai.routes';

const app = express();

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// ─── SWAGGER ──────────────────────────────────────────────────────────────────
const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    system: 'REMA — Rapid Emergency Medical Access',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── PUBLIC STATUS (no auth required) ────────────────────────────────────────
app.get('/api/status', publicStatus);

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes); // remove before final deployment

// User management
app.use('/api/users', userRoutes);

// Chat 4
app.use('/api/alert', alertRoutes);
app.use('/api/score', scoreRouter);
app.use('/api/households', householdRouter);

// Chat 5
app.use('/api/stock', stockRoutes);
app.use('/api/districts', districtRoutes);

// Chat 6
app.use('/api/delivery', deliveryRoutes);
app.use('/api/route', routeRoutes);

// Chat 7
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/radio', radioRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Chat 20
app.use('/api/ai', aiRoutes);

// ─── 404 FALLBACK ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;