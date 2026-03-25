import 'dotenv/config';
import { DataSource } from 'typeorm';
import { createDatabaseOptions } from './database.config';

export function createAppDataSource(): DataSource {
  return new DataSource(createDatabaseOptions());
}

const appDataSource = createAppDataSource();

export default appDataSource;
