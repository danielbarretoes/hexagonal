/**
 * Trace Middleware Tests
 */

import { TraceMiddleware } from './trace.middleware';
import { Request, Response, NextFunction } from 'express';

describe('TraceMiddleware', () => {
  let middleware: TraceMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    middleware = new TraceMiddleware();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should generate a new trace ID if not provided in headers', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.headers['x-trace-id']).toEqual(expect.any(String));
  });

  it('should use provided trace ID from x-trace-id header', () => {
    mockRequest.headers = { 'x-trace-id': 'custom-trace-id-123' };

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.headers['x-trace-id']).toBe('custom-trace-id-123');
  });

  it('should set trace ID in response header', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'x-trace-id',
      mockRequest.headers['x-trace-id'],
    );
  });

  it('should call next function', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
  });

  it('should use custom trace ID for both request and response header', () => {
    mockRequest.headers = { 'x-trace-id': 'my-custom-trace' };

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.headers['x-trace-id']).toBe('my-custom-trace');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('x-trace-id', 'my-custom-trace');
  });
});
