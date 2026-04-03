import { UsageCounter } from './usage-counter.entity';

describe('UsageCounter', () => {
  it('rounds the bucket start down to the current UTC hour on creation', () => {
    const counter = UsageCounter.create({
      metricKey: 'api_key.request',
      organizationId: 'org-1',
      userId: 'user-1',
      apiKeyId: 'key-1',
      routeKey: 'GET /projects',
      statusCode: 200,
      occurredAt: new Date('2026-04-01T10:37:45.123Z'),
    });

    expect(counter.bucketStart.toISOString()).toBe('2026-04-01T10:00:00.000Z');
    expect(counter.count).toBe(1);
    expect(counter.lastSeenAt.toISOString()).toBe('2026-04-01T10:37:45.123Z');
  });

  it('rehydrates persisted counters without mutating their values', () => {
    const counter = UsageCounter.rehydrate({
      metricKey: 'api_key.request',
      bucketStart: new Date('2026-04-01T10:00:00.000Z'),
      organizationId: 'org-1',
      userId: 'user-1',
      apiKeyId: 'key-1',
      routeKey: 'GET /projects',
      statusCode: 429,
      count: 7,
      lastSeenAt: new Date('2026-04-01T10:59:59.000Z'),
    });

    expect(counter.statusCode).toBe(429);
    expect(counter.count).toBe(7);
    expect(counter.lastSeenAt.toISOString()).toBe('2026-04-01T10:59:59.000Z');
  });
});
