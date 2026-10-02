// config.ts reads env at import time — load a fresh copy per scenario

function loadConfig(env: Record<string, string | undefined>) {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k];
  try {
    let config: typeof import('../../config').config | undefined;
    jest.isolateModules(() => { config = require('../../config').config; });
    return config!;
  } finally {
    process.env = saved;
  }
}

describe('config', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('refuses to start in production without a JWT secret', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', JWT_SECRET: undefined })).toThrow(/JWT_SECRET/);
  });

  it('refuses the published development secret in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', JWT_SECRET: 'rema-dev-secret-change-in-production' }))
      .toThrow(/JWT_SECRET/);
  });

  it('allows a fallback secret in development', () => {
    expect(loadConfig({ NODE_ENV: 'development', JWT_SECRET: undefined }).jwtSecret).toBeTruthy();
  });

  it('parses CORS_ORIGINS and strips trailing slashes', () => {
    const config = loadConfig({ CORS_ORIGINS: 'https://a.example/, https://b.example' });
    expect(config.corsOrigins).toEqual(['https://a.example', 'https://b.example']);
  });

  it('trusts one proxy hop in production by default', () => {
    expect(loadConfig({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(40), TRUST_PROXY: undefined }).trustProxy).toBe(1);
  });
});
