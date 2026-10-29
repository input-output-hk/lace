import { executeCircuit } from '@lace-lib/midnight-prover';
import {
  fromProvingProvider,
  ProvingError,
} from '@midnightntwrk/wallet-sdk/capabilities/proving';
import { Effect } from 'effect';

import {
  createConfiguredWasmProver,
  wasmProofActivities,
} from './wasm-proof-backend';

import type {
  AttestationProgressEvent,
  ProofCircuitProvider,
} from './midnight-proof-servers';
import type { ProofServerAccess } from './proof-server-transport';
import type { ProofJobObserver } from '@lace-lib/midnight-prover';

// Effect's rendered FiberFailure omits nested SDK causes. Include their messages
// in the diagnostic shown to the caller, without copying arbitrary error fields.
const withProvingErrorDetails = (error: ProvingError): ProvingError => {
  const messages = new Set<string>();
  const seen = new Set<unknown>();
  let cause: unknown = error;
  while (cause instanceof Error && !seen.has(cause) && seen.size < 8) {
    seen.add(cause);
    if (cause.message) messages.add(cause.message);
    cause = cause.cause;
  }
  if (typeof cause === 'string') messages.add(cause);
  const message = [...messages]
    .join(': ')
    .replace(/\b(?:https?|wss?|file|chrome-extension):\/\/\S+/gi, '[URL]')
    .slice(0, 512);
  if (message === error.message) return error;
  return new ProvingError({
    message,
    cause: error,
  });
};

export const createWasmProofServerAccess = (
  provider?: ProofCircuitProvider,
  onProgress?: (event: AttestationProgressEvent) => void,
): ProofServerAccess => {
  // Fail at configuration time if this runtime cannot host a WASM prover.
  if (!provider) createConfiguredWasmProver(onProgress);
  const raw = (observe: ProofJobObserver) =>
    provider ?? createConfiguredWasmProver(onProgress, observe);
  const combined = async (
    request: Parameters<ProofCircuitProvider['prove']>[0],
    observe: ProofJobObserver,
    signal?: AbortSignal,
  ) => {
    const id = crypto.randomUUID();
    return (await executeCircuit(
      raw(observe),
      { method: 'checkAndProve', circuit: request },
      {
        report: stage => {
          observe(id, 'running', stage);
        },
        signal,
      },
    )) as Uint8Array;
  };
  return {
    circuits: {
      checkAndProve: async (request, signal) =>
        wasmProofActivities.run(
          'proof',
          async observe => combined(request, observe, signal),
          true,
        ),
      prepare: method => {
        const activity = wasmProofActivities.prepare(
          method === 'check' ? 'check' : 'proof',
          method === 'checkAndProve',
        );
        return {
          fail: activity.fail,
          provider: {
            checkAndProve: async (request, signal) =>
              activity.run(async observe => combined(request, observe, signal)),
            check: async (request, signal) =>
              activity.run(async observe =>
                raw(observe).check(request, signal),
              ),
            prove: async (request, signal) =>
              activity.run(async observe =>
                raw(observe).prove(request, signal),
              ),
          },
        };
      },
      check: async (request, signal) =>
        wasmProofActivities.run('check', async observe =>
          raw(observe).check(request, signal),
        ),
      prove: async (request, signal) =>
        wasmProofActivities.run('proof', async observe =>
          raw(observe).prove(request, signal),
        ),
    },
    provingService: {
      prove: async transaction =>
        wasmProofActivities.run('transaction', async observe => {
          const circuits = raw(observe);
          const pending = new Set<Promise<unknown>>();
          const track = async <T>(promise: Promise<T>) => {
            pending.add(promise);
            void promise.then(
              () => pending.delete(promise),
              () => pending.delete(promise),
            );
            return promise;
          };
          const service = fromProvingProvider({
            check: async (serializedPreimage, keyLocation) =>
              track(circuits.check({ serializedPreimage, keyLocation })),
            prove: async (
              serializedPreimage,
              keyLocation,
              overwriteBindingInput,
            ) =>
              track(
                circuits.prove({
                  serializedPreimage,
                  keyLocation,
                  overwriteBindingInput,
                }),
              ),
          });
          try {
            return await Effect.runPromise(
              service
                .prove(transaction)
                .pipe(Effect.mapError(withProvingErrorDetails)),
            );
          } finally {
            // SDK failure may interrupt sibling effects without cancelling their
            // native promises. Keep the group active until those jobs settle.
            await Promise.allSettled(pending);
          }
        }),
    },
  };
};
