import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { HttpError } from '../lib/errors';

// ─── CENTRAL ERROR → HTTP MAPPING ─────────────────────────────────────────────
// One place decides what status and message a client sees for an error.
//
//   HttpError (lib/errors)        → its own status + message
//   Prisma known errors           → 404 / 409 / 400 with a generic message
//   plain `new Error('...')`      → `fallbackStatus` + message. Services throw these
//                                   for business rules ("Cannot abort run ..."), so the
//                                   text is written for users. Not shown for 5xx.
//   anything else                 → 500 "Internal server error", details logged only
//
// Controllers call sendError(res, err, <status they used before>) in their catch.

export function sendError(res: Response, err: unknown, fallbackStatus = 500): void {
  if (err instanceof HttpError) {
    res.status(err.status).json(
      err.details === undefined ? { error: err.message } : { error: err.message, details: err.details }
    );
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = PRISMA_ERRORS[err.code];
    if (mapped) {
      res.status(mapped.status).json({ error: mapped.message });
      return;
    }
  }

  if (err instanceof Error && err.constructor === Error && fallbackStatus < 500) {
    res.status(fallbackStatus).json({ error: err.message });
    return;
  }

  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error' });
}

const PRISMA_ERRORS: Record<string, { status: number; message: string }> = {
  P2025: { status: 404, message: 'Record not found' },
  P2002: { status: 409, message: 'A record with these details already exists' },
  P2003: { status: 400, message: 'A referenced record does not exist' },
};

// Errors passed to next(err) — middleware failures, malformed JSON bodies, etc.
export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) return next(err);

  // body-parser errors carry a `type`
  const type = (err as { type?: string })?.type;
  if (type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Request body is not valid JSON' });
    return;
  }
  if (type === 'entity.too.large') {
    res.status(413).json({ error: 'Request body is too large' });
    return;
  }

  sendError(res, err);
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Route not found' });
}
