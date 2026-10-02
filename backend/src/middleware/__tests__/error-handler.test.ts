import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { sendError, errorHandler } from '../error-handler';
import { NotFoundError, UnprocessableError } from '../../lib/errors';

function mockRes() {
  const res = { statusCode: 0, body: undefined as unknown, headersSent: false } as unknown as Response & { body: unknown };
  res.status = jest.fn((code: number) => { res.statusCode = code; return res; }) as never;
  res.json = jest.fn((body: unknown) => { res.body = body; return res; }) as never;
  return res;
}

describe('sendError', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('uses the status of typed HttpErrors', () => {
    const res = mockRes();
    sendError(res, new UnprocessableError('Insufficient stock'), 400);
    expect(res.statusCode).toBe(422);
    expect(res.body).toEqual({ error: 'Insufficient stock' });

    const res2 = mockRes();
    sendError(res2, new NotFoundError('Delivery run not found'), 400);
    expect(res2.statusCode).toBe(404);
  });

  it('keeps business-rule messages from plain Errors at the fallback status', () => {
    const res = mockRes();
    sendError(res, new Error('Cannot deactivate your own account'), 400);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Cannot deactivate your own account' });
  });

  it('never leaks the message of a 5xx', () => {
    const res = mockRes();
    sendError(res, new Error('connect ECONNREFUSED 10.0.0.5:5432'), 500);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });

  it('treats unexpected error types as 500 even with a 4xx fallback', () => {
    const res = mockRes();
    sendError(res, new TypeError("Cannot read properties of undefined (reading 'id')"), 400);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });

  it('maps Prisma known errors to safe messages', () => {
    const notFound = new Prisma.PrismaClientKnownRequestError('Record to update not found. (internal details)', {
      code: 'P2025', clientVersion: 'test',
    });
    const res = mockRes();
    sendError(res, notFound, 400);
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Record not found' });

    const unique = new Prisma.PrismaClientKnownRequestError('Unique constraint failed on users_email_key', {
      code: 'P2002', clientVersion: 'test',
    });
    const res2 = mockRes();
    sendError(res2, unique, 400);
    expect(res2.statusCode).toBe(409);
  });
});

describe('errorHandler', () => {
  it('turns malformed JSON into a 400 JSON response', () => {
    const res = mockRes();
    errorHandler(Object.assign(new SyntaxError('Unexpected token'), { type: 'entity.parse.failed' }), {} as never, res, jest.fn());
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Request body is not valid JSON' });
  });
});
