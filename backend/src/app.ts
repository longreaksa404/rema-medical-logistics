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
import { scoreRouter, householdRouter } from './routes/household.routes';


const app = express();

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors());
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

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes); // remove before final deployment

// Chat 4
app.use('/api/alert', alertRoutes);
app.use('/api/score', scoreRouter);
app.use('/api/households', householdRouter);

// Chat 5
app.use('/api/stock', stockRoutes);
app.use('/api/districts', districtRoutes);

// Chat 6: /api/delivery, /api/route
// Chat 7: /api/volunteers, /api/incidents, /api/radio, /api/notifications, /api/dashboard

// ─── 404 FALLBACK ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;