import { EventEmitter } from 'node:events';
import type { NextFunction, Response } from 'express';
import type { HttpLogRequest } from '../../../../../common/http/http-log-context';
import { writeStructuredLog } from '../../../../../common/observability/logging/structured-log.util';
import { HttpLogsMiddleware } from './http-logs.middleware';

jest.mock('../../../../../common/observability/logging/structured-log.util', () => ({
  writeStructuredLog: jest.fn(),
}));

type MockResponse = Response &
  EventEmitter & {
    statusCode: number;
    json: jest.Mock;
    send: jest.Mock;
  };

function createResponse(statusCode = 200): MockResponse {
  const response = new EventEmitter() as MockResponse;

  response.statusCode = statusCode;
  response.json = jest.fn((body?: unknown) => body) as unknown as jest.Mock;
  response.send = jest.fn((body?: unknown) => body) as unknown as jest.Mock;

  return response;
}

describe('HttpLogsMiddleware', () => {
  const execute = jest.fn();
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('captures response payloads and persists a sanitized log entry', async () => {
    const middleware = new HttpLogsMiddleware({
      execute,
    } as never);
    const response = createResponse(200);
    const request = {
      method: 'POST',
      path: '/api/v1/auth/login',
      originalUrl: '/api/v1/auth/login',
      headers: {
        'x-trace-id': 'trace-1',
      },
      body: {
        password: 'secret',
      },
      query: {},
      params: {},
      user: {
        userId: 'user-1',
      },
      effectiveOrganizationId: 'org-1',
    } as HttpLogRequest;
    execute.mockResolvedValue(undefined);

    middleware.use(request, response, next);
    response.json({ ok: true });
    response.emit('finish');
    await HttpLogsMiddleware.waitForIdle();

    expect(next).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/api/v1/auth/login',
        requestBody: {
          password: '[REDACTED]',
        },
        responseBody: {
          ok: true,
        },
        userId: 'user-1',
        organizationId: 'org-1',
        traceId: 'trace-1',
      }),
    );
    expect(writeStructuredLog).toHaveBeenCalledWith(
      'log',
      'HttpLogsMiddleware',
      'HTTP request completed',
      expect.objectContaining({
        event: 'http.request.completed',
        traceId: 'trace-1',
        method: 'POST',
        path: '/api/v1/auth/login',
      }),
    );
  });

  it('uses the normalized request path instead of leaking query string values to external logs', async () => {
    const middleware = new HttpLogsMiddleware({
      execute,
    } as never);
    const response = createResponse(200);
    const request = {
      method: 'GET',
      path: '/api/v1/auth/password-reset/confirm',
      originalUrl: '/api/v1/auth/password-reset/confirm?token=secret-token',
      headers: {
        'x-trace-id': 'trace-2',
      },
      body: null,
      query: {
        token: 'secret-token',
      },
      params: {},
    } as HttpLogRequest;
    execute.mockResolvedValue(undefined);

    middleware.use(request, response, next);
    response.send({ ok: true });
    response.emit('finish');
    await HttpLogsMiddleware.waitForIdle();

    expect(writeStructuredLog).toHaveBeenCalledWith(
      'log',
      'HttpLogsMiddleware',
      'HTTP request completed',
      expect.objectContaining({
        event: 'http.request.completed',
        path: '/api/v1/auth/password-reset/confirm',
      }),
    );
    expect(writeStructuredLog).not.toHaveBeenCalledWith(
      'log',
      'HttpLogsMiddleware',
      'HTTP request completed',
      expect.objectContaining({
        path: expect.stringContaining('secret-token'),
      }),
    );
  });

  it('logs failed responses and swallows persistence failures', async () => {
    const middleware = new HttpLogsMiddleware({
      execute,
    } as never);
    const response = createResponse(500);
    const request = {
      method: 'GET',
      path: '/api/v1/users/1',
      originalUrl: '/api/v1/users/1',
      headers: {},
      body: null,
      query: {},
      params: {
        id: '1',
      },
      httpLogError: {
        message: 'boom',
        stack: 'stack-line',
      },
    } as HttpLogRequest;
    execute.mockRejectedValue(new Error('write failed'));

    middleware.use(request, response, next);
    response.send({ status: 'failed' });
    response.emit('finish');
    await HttpLogsMiddleware.waitForIdle();

    expect(writeStructuredLog).toHaveBeenCalledWith(
      'error',
      'HttpLogsMiddleware',
      'Failed to persist HTTP log',
      expect.objectContaining({
        event: 'http_log.persist.failed',
        errorMessage: 'write failed',
      }),
    );
    expect(writeStructuredLog).toHaveBeenCalledWith(
      'error',
      'HttpLogsMiddleware',
      'HTTP request completed with error',
      expect.objectContaining({
        event: 'http.request.completed',
        path: '/api/v1/users/1',
      }),
    );
  });
});
