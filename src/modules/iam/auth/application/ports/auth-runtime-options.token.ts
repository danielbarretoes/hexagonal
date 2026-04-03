export interface AuthRuntimeOptions {
  readonly refreshSessionTtlMs: number;
  readonly exposePrivateTokens: boolean;
  readonly rateLimitingEnabled: boolean;
  readonly rateLimitTtlMs: number;
  readonly rateLimitLimit: number;
}

export const AUTH_RUNTIME_OPTIONS = Symbol('AUTH_RUNTIME_OPTIONS');
