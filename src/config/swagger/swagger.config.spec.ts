import { SwaggerModule } from '@nestjs/swagger';
import { configureSwagger, isSwaggerEnabled } from './swagger.config';
import { getAppConfig } from '../env/app-config';

jest.mock('../env/app-config', () => ({
  getAppConfig: jest.fn(),
}));

describe('swagger config', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports whether swagger is enabled from runtime config', () => {
    jest.mocked(getAppConfig).mockReturnValue({
      swaggerEnabled: true,
    } as never);

    expect(isSwaggerEnabled()).toBe(true);
  });

  it('skips swagger setup when the feature is disabled', () => {
    jest.mocked(getAppConfig).mockReturnValue({
      swaggerEnabled: false,
    } as never);
    const createDocumentSpy = jest.spyOn(SwaggerModule, 'createDocument');
    const setupSpy = jest.spyOn(SwaggerModule, 'setup');

    configureSwagger({} as never);

    expect(createDocumentSpy).not.toHaveBeenCalled();
    expect(setupSpy).not.toHaveBeenCalled();
  });

  it('creates and registers the swagger document when enabled', () => {
    jest.mocked(getAppConfig).mockReturnValue({
      swaggerEnabled: true,
    } as never);
    const document = { openapi: '3.0.0' };
    const createDocumentSpy = jest.spyOn(SwaggerModule, 'createDocument').mockReturnValue(document);
    const setupSpy = jest.spyOn(SwaggerModule, 'setup').mockImplementation();

    configureSwagger({} as never);

    expect(createDocumentSpy).toHaveBeenCalledTimes(1);
    expect(setupSpy).toHaveBeenCalledWith('docs', {} as never, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  });
});
