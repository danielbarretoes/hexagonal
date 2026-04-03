import type { DataSource, EntityManager } from 'typeorm';
import { TypeormTransactionContext } from './typeorm-transaction.context';
import { TypeormTransactionRunnerAdapter } from './typeorm-transaction-runner.adapter';

describe('TypeormTransactionRunnerAdapter', () => {
  it('reuses the active transaction manager when one is already bound', async () => {
    const dataSource = {
      transaction: jest.fn(),
    } as unknown as DataSource;
    const adapter = new TypeormTransactionRunnerAdapter(dataSource);

    await TypeormTransactionContext.run({} as EntityManager, async () => {
      const result = await adapter.runInTransaction(async () => 'done');

      expect(result).toBe('done');
    });

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('creates a new transaction and binds the manager to the async context', async () => {
    const manager = { id: 'manager-1' } as EntityManager;
    const dataSource = {
      transaction: jest.fn(async (operation: (value: EntityManager) => Promise<string>) =>
        operation(manager),
      ),
    } as unknown as DataSource;
    const adapter = new TypeormTransactionRunnerAdapter(dataSource);

    const result = await adapter.runInTransaction(async () => {
      expect(TypeormTransactionContext.getManager()).toBe(manager);
      return 'done';
    });

    expect(result).toBe('done');
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });
});
