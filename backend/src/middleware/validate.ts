import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodType } from 'zod';
import { BadRequestError } from '../lib/errors';
import { sendError } from './error-handler';

// ─── REQUEST VALIDATION ───────────────────────────────────────────────────────
// router.post('/x', requireAuth, validate({ body: schema }), handler)
// On success the parsed (trimmed, coerced, defaulted) value replaces req.body /
// req.query / req.params, so handlers only ever see validated data.
// On failure: 400 { error: "quantity: Too small ...", details: [{ path, message }] }

type Part = 'params' | 'query' | 'body';

export function validate(schemas: Partial<Record<Part, ZodType>>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const part of ['params', 'query', 'body'] as const) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part] ?? {});
      if (!result.success) {
        const details = result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));
        const summary = details.map((d) => (d.path ? `${d.path}: ${d.message}` : d.message)).join('; ');
        sendError(res, new BadRequestError(summary, details));
        return;
      }

      // req.query is a getter-backed object in some Express versions — define, don't assign
      Object.defineProperty(req, part, { value: result.data, writable: true, configurable: true, enumerable: true });
    }
    next();
  };
}
