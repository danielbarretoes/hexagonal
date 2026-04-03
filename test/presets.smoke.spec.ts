import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { databaseConfig } from '../src/config/database/database.config';
import { CorePresetModule } from '../src/presets/core-preset.module';
import { OperationsPresetModule } from '../src/presets/operations-preset.module';
import { resetTestDatabase } from './support/test-database';

jest.setTimeout(60000);

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
    }),
    CorePresetModule,
  ],
})
class CoreOnlyTemplateModule {}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
    }),
    CorePresetModule,
    OperationsPresetModule,
  ],
})
class CoreAndOperationsTemplateModule {}

async function compileModule(moduleClass: object): Promise<void> {
  const seedDataSource = await resetTestDatabase();
  await seedDataSource.destroy();

  const testingModule = await Test.createTestingModule({
    imports: [moduleClass],
  }).compile();

  await testingModule.close();
}

describe('preset compositions', () => {
  it('compiles the core-only preset composition', async () => {
    await compileModule(CoreOnlyTemplateModule);
  }, 60000);

  it('compiles the core plus operations preset composition', async () => {
    await compileModule(CoreAndOperationsTemplateModule);
  }, 60000);

  it('compiles the full app module composition', async () => {
    await compileModule(AppModule);
  }, 60000);
});
