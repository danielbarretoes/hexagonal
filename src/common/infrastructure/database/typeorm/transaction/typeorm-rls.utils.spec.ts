import type { DataSource, EntityManager } from 'typeorm';
import { TypeormTransactionContext } from './typeorm-transaction.context';
import { applyTypeormRlsContext, withTypeormManager } from './typeorm-rls.utils';

describe('typeorm RLS utilities', () => {
  it('reuses the active transaction manager when one is already bound', async () => {
    const activeManager = { id: 'manager-1' } as EntityManager;
    const dataSource = {
      transaction: jest.fn(),
    } as unknown as DataSource;

    await TypeormTransactionContext.run(activeManager, async () => {
      const result = await withTypeormManager(dataSource, async (manager) => manager);
      expect(result).toBe(activeManager);
    });

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('opens a new transaction when no manager is active', async () => {
    const manager = { id: 'manager-2' } as EntityManager;
    const dataSource = {
      transaction: jest.fn(async (operation: (value: EntityManager) => Promise<EntityManager>) =>
        operation(manager),
      ),
    } as unknown as DataSource;

    const result = await withTypeormManager(dataSource, async (value) => value);

    expect(result).toBe(manager);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('applies the runtime role and tenant settings to the active manager', async () => {
    const manager = {
      query: jest.fn().mockResolvedValue(undefined),
    } as unknown as EntityManager;

    await applyTypeormRlsContext(
      manager,
      {
        'app.current_organization_id': 'org-1',
        'app.current_user_id': 'user-1',
      },
      'hexagonal_app_runtime',
    );

    expect(manager.query).toHaveBeenNthCalledWith(1, 'SET LOCAL ROLE hexagonal_app_runtime');
    expect(manager.query).toHaveBeenNthCalledWith(2, 'SELECT set_config($1, $2, true)', [
      'app.current_organization_id',
      'org-1',
    ]);
    expect(manager.query).toHaveBeenNthCalledWith(3, 'SELECT set_config($1, $2, true)', [
      'app.current_user_id',
      'user-1',
    ]);
  });
});
