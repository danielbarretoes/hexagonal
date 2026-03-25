/**
 * Base exception class for all domain-level exceptions.
 * Domain exceptions represent business rule violations and should never leak infrastructure concerns.
 */

export abstract class DomainException extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
