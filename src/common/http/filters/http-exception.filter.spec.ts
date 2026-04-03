/**
 * Global Exception Filter Tests
 * Tests RFC 7807 Problem Details implementation
 */

import { GlobalExceptionFilter } from './http-exception.filter';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { Response, Request } from 'express';
import { InvalidCredentialsException } from '../../../modules/iam/shared/domain/exceptions';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new GlobalExceptionFilter({
      baseUrl: 'https://api.hexagonal.com',
      exposeUnexpectedDetails: true,
    });

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/api/users',
      headers: {},
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;
  });

  describe('HTTP Exceptions', () => {
    it('should handle HttpException with 400 status', () => {
      const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('bad-request'),
          title: 'HttpException',
          status: 400,
          detail: 'Bad Request',
        }),
      );
    });

    it('should handle HttpException with 401 status', () => {
      const exception = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('unauthorized'),
          status: 401,
        }),
      );
    });

    it('should handle HttpException with 404 status', () => {
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('not-found'),
          status: 404,
        }),
      );
    });

    it('should handle HttpException with custom response object', () => {
      const exception = new HttpException(
        { message: 'Custom message', title: 'Custom Title' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Custom Title',
          detail: 'Custom message',
        }),
      );
    });

    it('should handle validation errors (array message)', () => {
      const exception = new HttpException(
        { message: ['email must be an email', 'password is required'] },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          'type': expect.stringContaining('validation-failed'),
          'invalid-params': expect.arrayContaining([
            expect.objectContaining({ name: 'email' }),
            expect.objectContaining({ name: 'password' }),
          ]),
        }),
      );
    });

    it('should extract traceId from request headers', () => {
      mockRequest.headers = { 'x-trace-id': 'custom-trace-123' };
      const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: 'custom-trace-123',
        }),
      );
    });

    it('should generate traceId when not provided', () => {
      const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: expect.any(String),
        }),
      );
    });

    it('should include instance URL in response', () => {
      mockRequest.url = '/api/test';
      const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          instance: '/api/test',
        }),
      );
    });
  });

  describe('Generic Errors', () => {
    it('should map domain exceptions to business HTTP status codes', () => {
      const exception = new InvalidCredentialsException();

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('invalid-credentials'),
          status: 401,
        }),
      );
    });

    it('should handle generic Error with 500 status', () => {
      const exception = new Error('Something went wrong');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('internal-server-error'),
          title: 'Internal Server Error',
          status: 500,
        }),
      );
    });

    it('should hide error message in production', () => {
      filter = new GlobalExceptionFilter({
        baseUrl: 'https://api.hexagonal.com',
        exposeUnexpectedDetails: false,
      });

      const exception = new Error('Sensitive error details');

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: 'An unexpected error occurred. Please try again later.',
        }),
      );
    });

    it('should show error message in development', () => {
      filter = new GlobalExceptionFilter({
        baseUrl: 'https://api.hexagonal.com',
        exposeUnexpectedDetails: true,
      });

      const exception = new Error('Debug error details');

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: 'Debug error details',
        }),
      );
    });
  });

  describe('Unknown Exceptions', () => {
    it('should handle non-Error exceptions with 500 status', () => {
      const exception = 'string error' as unknown;

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 500,
          title: 'Internal server error',
        }),
      );
    });
  });
});
