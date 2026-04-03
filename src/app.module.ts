import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database/database.config';
import { CorePresetModule } from './presets/core-preset.module';
import { IntegrationsPresetModule } from './presets/integrations-preset.module';
import { OperationsPresetModule } from './presets/operations-preset.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
    }),
    CorePresetModule,
    OperationsPresetModule,
    IntegrationsPresetModule,
  ],
})
export class AppModule {}
