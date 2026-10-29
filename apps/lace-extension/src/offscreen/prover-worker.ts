import { serveProofWorker } from '@lace-lib/midnight-prover/worker';

// This entry runs in a worker; the app's shared tsconfig otherwise infers Window.
declare const self: Parameters<typeof serveProofWorker>[0];

serveProofWorker(self, async () => {
  const { createWasmCircuitProvider } = await import(
    '@lace-lib/vendor/wasm-proof-compute'
  );
  return onProgress =>
    createWasmCircuitProvider(undefined, event => {
      if (
        event.type === 'phase' &&
        event.phase === 'proof-material' &&
        event.status !== 'failed'
      )
        onProgress({ phase: event.phase, status: event.status });
    });
});
