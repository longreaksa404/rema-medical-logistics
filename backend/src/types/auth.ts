// ─── JWT PAYLOAD ─────────────────────────────────────────────────────────────
// This is what we encode inside the JWT token.

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  districtId: string | null;
}

// ─── EXPRESS REQUEST EXTENSION ────────────────────────────────────────────────
// Adds `req.user` so TypeScript knows it exists on authenticated routes.

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}