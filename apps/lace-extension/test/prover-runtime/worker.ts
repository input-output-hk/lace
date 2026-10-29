import { serveProofWorker } from '@lace-lib/midnight-prover/worker';

declare const self: DedicatedWorkerGlobalScope;

// Deliberately block this thread. The test must still reach the document and SW.
serveProofWorker(self, async () => () => ({
  check: async () => [7n, undefined],
  prove: async ({ keyLocation, keyMaterial }) => {
    if (keyLocation === 'crash') {
      // Escape the RPC handler to trigger a real Worker error event.
      setTimeout(() => {
        throw new Error('Synthetic worker failure');
      }, 500);
      return new Promise<Uint8Array>(() => undefined);
    }
    if (keyLocation === 'large') return keyMaterial!.proverKey.slice();
    const end = Date.now() + Number(keyLocation);
    while (Date.now() < end) {
      /* synchronous computation */
    }
    return new Uint8Array([1, 2, 3]);
  },
}));
