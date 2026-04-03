import { OutboxAsyncJobDispatcherAdapter } from './outbox-async-job-dispatcher.adapter';

describe('OutboxAsyncJobDispatcherAdapter', () => {
  it('persists async jobs with default group and deduplication keys', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const adapter = new OutboxAsyncJobDispatcherAdapter({ create } as never);

    await adapter.dispatch({
      type: 'webhook_delivery',
      payload: { eventId: 'event-1' },
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'webhook_delivery',
        traceId: null,
        groupKey: 'webhook_delivery',
      }),
    );
  });

  it('persists explicit trace, group, deduplication, and delayed schedule metadata', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const adapter = new OutboxAsyncJobDispatcherAdapter({ create } as never);

    await adapter.dispatch({
      type: 'transactional_email',
      payload: { type: 'welcome' },
      traceId: 'trace-1',
      groupId: 'emails',
      deduplicationId: 'dedupe-1',
      delaySeconds: 30,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transactional_email',
        traceId: 'trace-1',
        groupKey: 'emails',
        deduplicationKey: 'dedupe-1',
        nextAttemptAt: expect.any(Date),
      }),
    );
  });
});
