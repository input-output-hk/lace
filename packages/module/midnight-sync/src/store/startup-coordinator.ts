const yieldToEventLoop = async () =>
  new Promise<void>(resolve => setTimeout(resolve, 0));

/** Gates network startup on every registered account's local preparation. */
export class MidnightStartupCoordinator {
  private readonly preparing = new Set<object>();
  private readonly waitingForPeers = new Map<object, () => void>();
  private restoreTail: Promise<unknown> = Promise.resolve();
  private releasing = false;

  public register() {
    const token = {};
    this.preparing.add(token);
    let isCancelled = false;
    const assertActive = () => {
      if (isCancelled) throw new Error('Midnight wallet startup cancelled');
    };
    return {
      get cancelled() {
        return isCancelled;
      },
      // Only synchronous, local work belongs here. Auth and network requests
      // must not hold the restore queue (LW-15215).
      enqueueLocalRestore: async <T>(work: () => T): Promise<T> => {
        const run = this.restoreTail.then(async () => {
          await yieldToEventLoop();
          assertActive();
          return work();
        });
        this.restoreTail = run.catch(() => undefined);
        return run;
      },
      finishPreparationAndWaitForPeers: async () => {
        assertActive();
        this.preparing.delete(token);
        await new Promise<void>(resolve => {
          this.waitingForPeers.set(token, resolve);
          this.releaseReady();
        });
        assertActive();
      },
      cancel: () => {
        isCancelled = true;
        this.preparing.delete(token);
        this.waitingForPeers.get(token)?.();
        this.waitingForPeers.delete(token);
        this.releaseReady();
      },
    };
  }

  private releaseReady() {
    if (
      this.releasing ||
      this.preparing.size > 0 ||
      this.waitingForPeers.size === 0
    )
      return;
    this.releasing = true;
    // Recheck after yielding: another account can join before sync starts.
    void yieldToEventLoop().then(() => {
      this.releasing = false;
      if (this.preparing.size > 0) return;
      const next = this.waitingForPeers.entries().next().value;
      if (next) {
        const [token, resolve] = next;
        this.waitingForPeers.delete(token);
        resolve();
        this.releaseReady();
      }
    });
  }
}

export type MidnightStartup = ReturnType<
  MidnightStartupCoordinator['register']
>;
