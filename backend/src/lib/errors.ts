// ─── TYPED HTTP ERRORS ────────────────────────────────────────────────────────
// Services throw these instead of bare Error so the HTTP layer can map them to
// the right status code without string-matching messages.

export class HttpError extends Error {
  constructor(public readonly status: number, message: string, public readonly details?: unknown) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string, details?: unknown) { super(400, message, details); }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Not authenticated') { super(401, message); }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'You do not have permission to perform this action') { super(403, message); }
}

export class NotFoundError extends HttpError {
  constructor(message: string) { super(404, message); }
}

export class ConflictError extends HttpError {
  constructor(message: string) { super(409, message); }
}

// Request is well-formed but cannot be applied to current state (e.g. not enough stock)
export class UnprocessableError extends HttpError {
  constructor(message: string) { super(422, message); }
}
