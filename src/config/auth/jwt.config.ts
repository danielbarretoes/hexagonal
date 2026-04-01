/**
 * JWT Configuration
 */

import type { StringValue } from 'ms';

interface JwtConfig {
  secret: string;
  expiresIn: StringValue | number;
}

const isProduction = process.env.NODE_ENV === 'production';
const configuredSecret = process.env.JWT_SECRET;

if (isProduction && !configuredSecret) {
  throw new Error('JWT_SECRET must be defined in production environments');
}

export const JWT_CONFIG: JwtConfig = {
  secret: configuredSecret || 'hexagonal-development-secret-change-before-production-use',
  expiresIn: (process.env.JWT_EXPIRES_IN as StringValue | undefined) ?? '15m',
};
