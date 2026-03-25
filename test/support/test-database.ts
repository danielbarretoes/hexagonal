import 'dotenv/config';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { createAppDataSource } from '../../src/config/database/data-source';

export const TEST_TABLES = ['members', 'organizations', 'users'] as const;
export const RLS_RUNTIME_ROLE = 'hexagonal_app_runtime';

export function useTestDatabaseEnvironment(): void {
  process.env.NODE_ENV = 'test';
  process.env.DB_HOST = process.env.TEST_DB_HOST ?? process.env.DB_HOST;
  process.env.DB_PORT = process.env.TEST_DB_PORT ?? process.env.DB_PORT;
  process.env.DB_USERNAME = process.env.TEST_DB_USERNAME ?? process.env.DB_USERNAME;
  process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD ?? process.env.DB_PASSWORD;
  process.env.DB_DATABASE = process.env.TEST_DB_DATABASE ?? process.env.DB_DATABASE;
  process.env.DB_SYNC = 'false';
  process.env.DB_DROP_SCHEMA = 'false';
  process.env.DB_MIGRATIONS_RUN = 'false';
  process.env.DB_LOGGING = 'false';
}

export async function resetTestDatabase(): Promise<DataSource> {
  useTestDatabaseEnvironment();
  const dataSource = createAppDataSource();
  await dataSource.initialize();
  await dataSource.query('DROP SCHEMA IF EXISTS public CASCADE');
  await dataSource.query('CREATE SCHEMA public');
  await dataSource.runMigrations();
  return dataSource;
}

export async function truncateIamTables(dataSource: DataSource): Promise<void> {
  const tableList = TEST_TABLES.map((table) => `"${table}"`).join(', ');
  await dataSource.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`);
}

export function createTestPostgresClient(): Client {
  useTestDatabaseEnvironment();

  return new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
}
