import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs successful requests with the final status code and duration', async () => {
    const interceptor = new LoggingInterceptor();
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValueOnce(150);

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', url: '/projects' }),
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as ExecutionContext;
    const next = {
      handle: () => of({ ok: true }),
    } as CallHandler;

    await lastValueFrom(interceptor.intercept(context, next));

    expect(logSpy).toHaveBeenCalledWith('GET /projects 200 - 50ms');
  });

  it('logs failed requests with the error message and duration', async () => {
    const interceptor = new LoggingInterceptor();
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Date, 'now').mockReturnValueOnce(200).mockReturnValueOnce(260);

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', url: '/projects' }),
        getResponse: () => ({ statusCode: 500 }),
      }),
    } as ExecutionContext;
    const next = {
      handle: () => throwError(() => new Error('boom')),
    } as CallHandler;

    await expect(lastValueFrom(interceptor.intercept(context, next))).rejects.toThrow('boom');
    expect(errorSpy).toHaveBeenCalledWith('POST /projects ERROR - 60ms: boom');
  });
});
