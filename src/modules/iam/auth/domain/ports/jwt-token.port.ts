/**
 * JWT Token Port
 * Defines interface for token generation and validation.
 * Located in domain layer as it's a port interface.
 */

export interface JwtTokenPort {
  generateToken(payload: { userId: string; email: string }): string;
  verifyToken(token: string): { userId: string; email: string } | null;
}
