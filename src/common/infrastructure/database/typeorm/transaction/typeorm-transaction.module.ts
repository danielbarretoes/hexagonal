import { Global, Module } from '@nestjs/common';
import { getAppConfig } from '../../../../../config/env/app-config';
import { TRANSACTION_RUNNER_PORT } from '../../../../../shared/application/ports/transaction-runner.token';
import {
  TYPEORM_RLS_RUNTIME_OPTIONS,
  type TypeormRlsRuntimeOptions,
} from './typeorm-rls-runtime-options.token';
import { TypeormTransactionRunnerAdapter } from './typeorm-transaction-runner.adapter';

@Global()
@Module({
  providers: [
    {
      provide: TYPEORM_RLS_RUNTIME_OPTIONS,
      useFactory: (): TypeormRlsRuntimeOptions => ({
        runtimeRole: getAppConfig().database.rlsRuntimeRole,
      }),
    },
    { provide: TRANSACTION_RUNNER_PORT, useClass: TypeormTransactionRunnerAdapter },
    TypeormTransactionRunnerAdapter,
  ],
  exports: [TYPEORM_RLS_RUNTIME_OPTIONS, TRANSACTION_RUNNER_PORT],
})
export class TypeormTransactionModule {}
