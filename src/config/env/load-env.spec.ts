describe('loadEnvironment', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  it('preserves explicit process env overrides over .env.test values', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      JOBS_ENABLED: 'true',
      JOBS_EMAIL_DELIVERY_MODE: 'async',
    };

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { loadEnvironment } = require('./load-env') as typeof import('./load-env');

    loadEnvironment();

    expect(process.env.JOBS_ENABLED).toBe('true');
    expect(process.env.JOBS_EMAIL_DELIVERY_MODE).toBe('async');
  });

  it('falls back to the example env files when local overrides do not exist', () => {
    const config = jest.fn();
    const existsSync = jest.fn(
      (filePath: string) => filePath === '.env.example' || filePath === '.env.test.example',
    );

    jest.doMock('dotenv', () => ({
      config,
    }));
    jest.doMock('node:fs', () => ({
      existsSync,
    }));

    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
    };

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { loadEnvironment } = require('./load-env') as typeof import('./load-env');
      loadEnvironment();
    });

    expect(config).toHaveBeenNthCalledWith(1, {
      path: '.env.example',
      override: false,
    });
    expect(config).toHaveBeenNthCalledWith(2, {
      path: '.env.test.example',
      override: true,
    });
  });
});
