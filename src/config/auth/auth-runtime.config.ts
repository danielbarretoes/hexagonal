export const AUTH_RUNTIME_CONFIG = {
  exposePrivateTokens:
    process.env.AUTH_EXPOSE_PRIVATE_TOKENS === 'true' || process.env.NODE_ENV === 'test',
  rateLimitingEnabled: process.env.AUTH_RATE_LIMIT_ENABLED !== 'false',
  rateLimitTtlMs: Number(process.env.AUTH_RATE_LIMIT_TTL_MS || '60000'),
  rateLimitLimit: Number(process.env.AUTH_RATE_LIMIT_LIMIT || '10'),
  refreshSessionTtlMs: Number(
    process.env.AUTH_REFRESH_TOKEN_TTL_MS || `${30 * 24 * 60 * 60 * 1000}`,
  ),
} as const;
