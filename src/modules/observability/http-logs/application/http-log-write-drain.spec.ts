import { HttpLogWriteDrain } from './http-log-write-drain';

describe('HttpLogWriteDrain', () => {
  it('waits for tracked writes to settle', async () => {
    let resolved = false;
    const pendingWrite = new Promise<void>((resolve) => {
      setTimeout(() => {
        resolved = true;
        resolve();
      }, 0);
    });

    HttpLogWriteDrain.track(pendingWrite);
    void pendingWrite.finally(() => HttpLogWriteDrain.resolve(pendingWrite));

    await HttpLogWriteDrain.waitForIdle();

    expect(resolved).toBe(true);
  });

  it('ignores writes that were already resolved and removed', async () => {
    const pendingWrite = Promise.resolve();

    HttpLogWriteDrain.track(pendingWrite);
    HttpLogWriteDrain.resolve(pendingWrite);

    await expect(HttpLogWriteDrain.waitForIdle()).resolves.toBeUndefined();
  });

  it('also waits for writes that are tracked while draining is in progress', async () => {
    let resolveFirst!: () => void;
    const firstWrite = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    let resolveSecond!: () => void;
    const secondWrite = new Promise<void>((resolve) => {
      resolveSecond = resolve;
    });

    HttpLogWriteDrain.track(firstWrite);

    const drainPromise = HttpLogWriteDrain.waitForIdle();
    HttpLogWriteDrain.track(secondWrite);

    resolveFirst();
    await firstWrite.finally(() => HttpLogWriteDrain.resolve(firstWrite));

    resolveSecond();
    await secondWrite.finally(() => HttpLogWriteDrain.resolve(secondWrite));

    await expect(drainPromise).resolves.toBeUndefined();
  });
});
