// ─── RUNTIME CONFIG ───────────────────────────────────────────────────────────
// Read once at startup (index.ts loads .env before importing the app).
// Production refuses to start with settings that would make it insecure.

const isProduction = process.env.NODE_ENV === 'production';

const DEV_JWT_SECRET = 'rema-dev-secret-change-in-production';

function readJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === DEV_JWT_SECRET) {
    if (isProduction) {
      throw new Error('JWT_SECRET must be set to a private random value in production');
    }
    console.warn('[config] JWT_SECRET not set — using an insecure development secret');
    return DEV_JWT_SECRET;
  }
  if (secret.length < 32) {
    console.warn('[config] JWT_SECRET is shorter than 32 characters — use a longer random value');
  }
  return secret;
}

// Origins allowed to call the API with credentials (cookies).
// Override with CORS_ORIGINS="https://a.example,https://b.example".
const DEFAULT_CORS_ORIGINS = [
  'https://rema-system.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

function readCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (!raw) return DEFAULT_CORS_ORIGINS;
  return raw.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
}

// Number of reverse proxies in front of the app (Render = 1). Needed so
// req.ip — and therefore rate limiting — sees the real client address.
function readTrustProxy(): number {
  const raw = process.env.TRUST_PROXY;
  if (raw !== undefined) return Number(raw) || 0;
  return isProduction ? 1 : 0;
}

export const config = {
  isProduction,
  jwtSecret: readJwtSecret(),
  corsOrigins: readCorsOrigins(),
  trustProxy: readTrustProxy(),
};
