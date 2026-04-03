import { GlobalExceptionFilter } from './common/http/filters/http-exception.filter';
import { PROBLEM_DETAILS_RUNTIME_OPTIONS } from './common/http/filters/problem-details-runtime-options.token';
import { configureHttpApplication } from './app.setup';
import { getAppConfig } from './config/env/app-config';
import { configureSwagger } from './config/swagger/swagger.config';

jest.mock('./config/env/app-config', () => ({
  getAppConfig: jest.fn(),
}));

jest.mock('./config/swagger/swagger.config', () => ({
  configureSwagger: jest.fn(),
}));

jest.mock('helmet', () => ({
  __esModule: true,
  default: jest.fn(() => 'helmet-middleware'),
}));

describe('configureHttpApplication', () => {
  const baseConfig = {
    http: {
      helmetEnabled: true,
      corsEnabled: true,
      corsOrigins: ['https://app.example.com'],
      trustProxy: true,
      bodyLimit: '2mb',
    },
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('configures the HTTP app with security middleware, parsers, pipes, filters, and swagger', () => {
    jest.mocked(getAppConfig).mockReturnValue(baseConfig as never);

    const app = {
      setGlobalPrefix: jest.fn(),
      enableVersioning: jest.fn(),
      use: jest.fn(),
      enableCors: jest.fn(),
      set: jest.fn(),
      useBodyParser: jest.fn(),
      useGlobalPipes: jest.fn(),
      useGlobalFilters: jest.fn(),
      get: jest.fn().mockReturnValue({
        baseUrl: 'https://api.example.com',
        exposeUnexpectedDetails: false,
      }),
    };

    configureHttpApplication(app as never);

    expect(app.setGlobalPrefix).toHaveBeenCalledWith('api');
    expect(app.enableVersioning).toHaveBeenCalled();
    expect(app.use).toHaveBeenCalledWith('helmet-middleware');
    expect(app.enableCors).toHaveBeenCalledWith({
      origin: ['https://app.example.com'],
    });
    expect(app.set).toHaveBeenCalledWith('trust proxy', true);
    expect(app.useBodyParser).toHaveBeenNthCalledWith(1, 'json', {
      limit: '2mb',
    });
    expect(app.useBodyParser).toHaveBeenNthCalledWith(2, 'urlencoded', {
      extended: true,
      limit: '2mb',
    });
    expect(app.useGlobalPipes).toHaveBeenCalledTimes(1);
    expect(app.get).toHaveBeenCalledWith(PROBLEM_DETAILS_RUNTIME_OPTIONS);
    expect(app.useGlobalFilters).toHaveBeenCalledWith(expect.any(GlobalExceptionFilter));
    expect(configureSwagger).toHaveBeenCalledWith(app);
  });

  it('skips optional security middleware when disabled', () => {
    jest.mocked(getAppConfig).mockReturnValue({
      http: {
        ...baseConfig.http,
        helmetEnabled: false,
        corsEnabled: false,
      },
    } as never);

    const app = {
      setGlobalPrefix: jest.fn(),
      enableVersioning: jest.fn(),
      use: jest.fn(),
      enableCors: jest.fn(),
      set: jest.fn(),
      useBodyParser: jest.fn(),
      useGlobalPipes: jest.fn(),
      useGlobalFilters: jest.fn(),
      get: jest.fn().mockReturnValue({
        baseUrl: 'https://api.example.com',
        exposeUnexpectedDetails: true,
      }),
    };

    configureHttpApplication(app as never);

    expect(app.use).not.toHaveBeenCalled();
    expect(app.enableCors).not.toHaveBeenCalled();
  });
});
