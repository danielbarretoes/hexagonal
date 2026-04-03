import type { LogLevel } from '@nestjs/common';
import type { RuntimeEnvironment } from '../../../shared/domain/runtime/runtime-environment';

export interface StructuredLoggingRuntimeOptions {
  readonly enabledLevels: LogLevel[];
  readonly json: boolean;
  readonly serviceName: string;
  readonly environment: RuntimeEnvironment;
}

const DEFAULT_RUNTIME_OPTIONS: StructuredLoggingRuntimeOptions = {
  enabledLevels: ['fatal', 'error', 'warn', 'log'],
  json: false,
  serviceName: 'nestjs-modular-saas-template',
  environment: 'development',
};

let runtimeOptions = DEFAULT_RUNTIME_OPTIONS;

export function initializeStructuredLoggingRuntime(options: StructuredLoggingRuntimeOptions): void {
  runtimeOptions = options;
}

export function getStructuredLoggingRuntime(): StructuredLoggingRuntimeOptions {
  return runtimeOptions;
}
