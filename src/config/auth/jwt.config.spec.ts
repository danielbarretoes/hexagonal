describe('JWT_CONFIG', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;

  afterEach(() => {
    jest.resetModules();

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  it('throws when JWT_SECRET is missing in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./jwt.config');
    }).toThrow('JWT_SECRET must be defined in production environments');
  });

  it('uses the development fallback secret outside production', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const configModule = require('./jwt.config') as typeof import('./jwt.config');

    expect(configModule.JWT_CONFIG.secret).toBe(
      'hexagonal-development-secret-change-before-production-use',
    );
  });
});
