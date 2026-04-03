import type { RuntimeEnvironment } from '../../../../../shared/domain/runtime/runtime-environment';

export interface ApiKeysRuntimeOptions {
  readonly nodeEnv: RuntimeEnvironment;
  readonly defaultTtlDays: number;
  readonly usageWriteIntervalMs: number;
  readonly secret: string;
}

export const API_KEYS_RUNTIME_OPTIONS = Symbol('API_KEYS_RUNTIME_OPTIONS');
