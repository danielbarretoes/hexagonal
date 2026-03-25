/**
 * JWT Token Adapter
 * Implements JwtTokenPort using @nestjs/jwt.
 */

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtTokenPort } from '../../domain/ports/jwt-token.port';
import { JWT_CONFIG } from '../../../../../config/auth/jwt.config';

@Injectable()
export class JwtTokenAdapter implements JwtTokenPort {
  constructor(private readonly jwtService: JwtService) {}

  generateToken(payload: { userId: string; email: string }): string {
    return this.jwtService.sign(payload, {
      secret: JWT_CONFIG.secret,
      expiresIn: JWT_CONFIG.expiresIn,
    });
  }

  verifyToken(token: string): { userId: string; email: string } | null {
    try {
      const payload = this.jwtService.verify<{ userId: string; email: string }>(token, {
        secret: JWT_CONFIG.secret,
      });
      return { userId: payload.userId, email: payload.email };
    } catch {
      return null;
    }
  }
}
