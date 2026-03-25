/**
 * RFC 7807 Problem Details for HTTP APIs
 * Standard error response format for RESTful APIs.
 * @see https://www.rfc-editor.org/rfc/rfc7807
 */

export interface ProblemDetail {
  /** URI that identifies the error type */
  type: string;
  /** Short, human-readable summary of the problem */
  title: string;
  /** HTTP status code */
  status: number;
  /** Specific explanation of this occurrence */
  detail: string;
  /** URI that identifies the specific resource/occurrence */
  instance: string;
  /** Timestamp when the error occurred */
  timestamp: string;
  /** Trace ID for debugging in production */
  traceId?: string;
}

export interface ValidationErrorDetail {
  /** Name of the field that failed validation */
  name: string;
  /** Reason why validation failed */
  reason: string;
}

export interface ValidationProblemDetail extends ProblemDetail {
  /** List of validation errors for specific fields */
  'invalid-params'?: ValidationErrorDetail[];
}

/** Factory to create problem detail URIs */
export function createErrorType(baseUrl: string, code: string): string {
  return `${baseUrl}/errors/${code}`;
}

/** Default error type base URL */
export const ERROR_TYPE_BASE_URL = process.env.API_BASE_URL || 'https://api.hexagonal.com';
