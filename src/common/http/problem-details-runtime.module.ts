import { Module } from '@nestjs/common';
import { getAppConfig } from '../../config/env/app-config';
import {
  PROBLEM_DETAILS_RUNTIME_OPTIONS,
  type ProblemDetailsRuntimeOptions,
} from './filters/problem-details-runtime-options.token';

@Module({
  providers: [
    {
      provide: PROBLEM_DETAILS_RUNTIME_OPTIONS,
      useFactory: (): ProblemDetailsRuntimeOptions => ({
        baseUrl: getAppConfig().apiBaseUrl,
        exposeUnexpectedDetails: getAppConfig().nodeEnv !== 'production',
      }),
    },
  ],
  exports: [PROBLEM_DETAILS_RUNTIME_OPTIONS],
})
export class ProblemDetailsRuntimeModule {}
