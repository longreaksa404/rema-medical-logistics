import request, { Response } from 'supertest';
import app, { io } from '../app';
import { prisma } from '../lib/prisma';
import { resetDb, seedFixture, Fixture, TEST_PASSWORD } from './helpers/db';
import { bearer } from './helpers/auth';

let fx: Fixture;

beforeEach(async () => {
  await resetDb();
  fx = await seedFixture();
});

afterAll(async () => {
  io.close();
  await prisma.$disconnect();
});

// The refresh cookie is Secure, so supertest won't replay it over http —
// pull it out of Set-Cookie and send it by hand.
function refreshCookieFrom(res: Response): string | undefined {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = raw?.find((c) => c.startsWith('rema_refresh='));
  const value = cookie?.split(';')[0];
  return value && value !== 'rema_refresh=' ? value : undefined;
}

async function login(email: string, password = TEST_PASSWORD) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return { res, cookie: refreshCookieFrom(res), token: res.body.token as string };
}

const refresh = (cookie: string) => request(app).post('/api/auth/refresh').set('Cookie', cookie);

describe('refresh token rotation', () => {
  it('issues a new refresh token on every refresh', async () => {
    const { cookie } = await login(fx.users.viewer.email);
    const first = await refresh(cookie!);
    expect(first.status).toBe(200);
    const rotated = refreshCookieFrom(first);
    expect(rotated).toBeDefined();
    expect(rotated).not.toBe(cookie);

    expect((await refresh(rotated!)).status).toBe(200);
  });

  it('tolerates a parallel refresh from another tab (grace window)', async () => {
    const { cookie } = await login(fx.users.viewer.email);
    expect((await refresh(cookie!)).status).toBe(200);
    const again = await refresh(cookie!);
    expect(again.status).toBe(200);
    expect(refreshCookieFrom(again)).toBeUndefined();   // keeps the cookie the browser already has
  });

  it('revokes every session when an old rotated token is replayed', async () => {
    const { cookie } = await login(fx.users.viewer.email);
    const next = refreshCookieFrom(await refresh(cookie!))!;

    // pretend the rotation happened a minute ago (outside the grace window)
    await prisma.refreshToken.updateMany({
      where: { rotatedAt: { not: null } },
      data: { rotatedAt: new Date(Date.now() - 60_000) },
    });

    expect((await refresh(cookie!)).status).toBe(401);  // replay detected
    expect((await refresh(next)).status).toBe(401);     // legitimate session killed too
  });
});

describe('sessions end when credentials or status change', () => {
  it('changing your password signs out other sessions but keeps this one', async () => {
    const phone  = await login(fx.users.hubA.email);
    const laptop = await login(fx.users.hubA.email);

    const change = await request(app).patch('/api/users/me/password')
      .set('Authorization', `Bearer ${laptop.token}`)
      .send({ currentPassword: TEST_PASSWORD, newPassword: 'a-brand-new-password' });
    expect(change.status).toBe(200);

    expect((await refresh(phone.cookie!)).status).toBe(401);
    const laptopCookie = refreshCookieFrom(change);
    expect(laptopCookie).toBeDefined();
    expect((await refresh(laptopCookie!)).status).toBe(200);
  });

  it('admin password reset and deactivation revoke sessions', async () => {
    const hub = await login(fx.users.hubA.email);
    await request(app).post(`/api/users/${fx.users.hubA.id}/reset-password`)
      .set(...bearer(fx.users.admin)).send({ temporaryPassword: 'temporary-pass-1' });
    expect((await refresh(hub.cookie!)).status).toBe(401);

    const vol = await login(fx.users.volunteerA.email);
    await request(app).patch(`/api/users/${fx.users.volunteerA.id}`)
      .set(...bearer(fx.users.admin)).send({ active: false });
    expect((await refresh(vol.cookie!)).status).toBe(401);
  });
});

describe('login rate limiting', () => {
  it('blocks an account after 10 failed attempts from the same address', async () => {
    const email = fx.users.coordinator.email;
    for (let i = 0; i < 10; i++) {
      expect((await login(email, 'wrong-password')).res.status).toBe(401);
    }
    const blocked = await login(email, 'wrong-password');
    expect(blocked.res.status).toBe(429);
    // the right password is blocked too until the window passes
    expect((await login(email)).res.status).toBe(429);
    // other accounts from the same address are unaffected
    expect((await login(fx.users.viewer.email)).res.status).toBe(200);
  });
});

describe('HTTP hardening', () => {
  it('only reflects allowed origins in CORS headers', async () => {
    const ok = await request(app).get('/api/health').set('Origin', 'https://rema-system.vercel.app');
    expect(ok.headers['access-control-allow-origin']).toBe('https://rema-system.vercel.app');

    const evil = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sends security headers and hides the framework', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
