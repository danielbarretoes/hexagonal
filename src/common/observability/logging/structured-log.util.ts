import { ConsoleLogger } from '@nestjs/common';
import type { LogLevel } from '@nestjs/common';
import { getStructuredLoggingRuntime } from './logging-runtime';

const LOGGER_CACHE = new Map<string, ConsoleLogger>();
const STDERR_LEVELS = new Set<LogLevel>(['error', 'fatal']);

export interface StructuredLogFields {
  event: string;
  traceId?: string | null;
  [key: string]: unknown;
}

function getFallbackLogger(context: string): ConsoleLogger {
  const existingLogger = LOGGER_CACHE.get(context);

  if (existingLogger) {
    return existingLogger;
  }

  const logger = new ConsoleLogger(context, {
    logLevels: getStructuredLoggingRuntime().enabledLevels,
  });
  LOGGER_CACHE.set(context, logger);

  return logger;
}

function isLevelEnabled(level: LogLevel): boolean {
  return getStructuredLoggingRuntime().enabledLevels.includes(level);
}

export function writeStructuredLog(
  level: LogLevel,
  context: string,
  message: string,
  fields: StructuredLogFields,
): void {
  if (!isLevelEnabled(level)) {
    return;
  }

  const runtime = getStructuredLoggingRuntime();

  if (!runtime.json) {
    getFallbackLogger(context)[level](`${message} ${JSON.stringify(fields)}`);
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: runtime.serviceName,
    environment: runtime.environment,
    context,
    message,
    ...fields,
  };
  const line = `${JSON.stringify(entry)}\n`;

  if (STDERR_LEVELS.has(level)) {
    process.stderr.write(line);
    return;
  }

  process.stdout.write(line);
}
