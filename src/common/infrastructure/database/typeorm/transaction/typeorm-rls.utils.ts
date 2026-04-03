import type { DataSource, EntityManager } from 'typeorm';
import { TypeormTransactionContext } from './typeorm-transaction.context';

export async function withTypeormManager<T>(
  dataSource: DataSource,
  operation: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  const activeManager = TypeormTransactionContext.getManager();

  if (activeManager) {
    return operation(activeManager);
  }

  return dataSource.transaction(operation);
}

export async function applyTypeormRlsContext(
  manager: EntityManager,
  settings: Record<string, string>,
  runtimeRole: string,
): Promise<void> {
  await manager.query(`SET LOCAL ROLE ${runtimeRole}`);

  for (const [settingName, settingValue] of Object.entries(settings)) {
    await manager.query(`SELECT set_config($1, $2, true)`, [settingName, settingValue]);
  }
}
