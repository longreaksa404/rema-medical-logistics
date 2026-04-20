import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

const app = express();

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json()); //translate from json to javascript

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

// ─── ROUTES (stubs — filled in later chats) ───────────────────────────────────
// Chat 3: /api/auth
// Chat 4: /api/alert, /api/score, /api/households
// Chat 5: /api/stock
// Chat 6: /api/delivery, /api/route
// Chat 7: /api/volunteers, /api/incidents, /api/radio, /api/notifications, /api/dashboard

// ─── 404 FALLBACK ────────────────────────────────────────────────────────────
app.use((_req, res) => { // return for route dosenot exist
  res.status(404).json({ error: 'Route not found' });
});

export default app;