import { existsSync } from 'node:fs';
import { config as loadDotenv } from 'dotenv';
import type { RuntimeEnvironment } from '../../shared/domain/runtime/runtime-environment';

export type { RuntimeEnvironment } from '../../shared/domain/runtime/runtime-environment';

function resolveRuntimeEnvironment(explicitEnvironment?: RuntimeEnvironment): RuntimeEnvironment {
  const runtimeEnvironment = explicitEnvironment ?? process.env.NODE_ENV;

  if (runtimeEnvironment === 'production' || runtimeEnvironment === 'test') {
    return runtimeEnvironment;
  }

  return 'development';
}

export function loadEnvironment(explicitEnvironment?: RuntimeEnvironment): RuntimeEnvironment {
  const runtimeEnvironment = resolveRuntimeEnvironment(explicitEnvironment);
  const explicitOverrides = new Map(
    Object.entries(process.env).filter(([, value]) => value !== undefined),
  );

  process.env.NODE_ENV = runtimeEnvironment;

  const baseEnvPath = existsSync('.env') ? '.env' : '.env.example';

  if (runtimeEnvironment !== 'production' && existsSync(baseEnvPath)) {
    loadDotenv({
      path: baseEnvPath,
      override: false,
    });
  }

  if (runtimeEnvironment === 'test') {
    const testEnvPath = existsSync('.env.test') ? '.env.test' : '.env.test.example';

    if (existsSync(testEnvPath)) {
      loadDotenv({
        path: testEnvPath,
        override: true,
      });
    }
  }

  if (runtimeEnvironment === 'production' && existsSync('.env')) {
    loadDotenv({
      path: '.env',
      override: false,
    });
  }

  explicitOverrides.forEach((value, key) => {
    process.env[key] = value;
  });

  return runtimeEnvironment;
}
