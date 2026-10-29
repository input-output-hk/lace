import { executeCircuit } from './execute';

import type {
  CircuitProvider,
  JobRequest,
  JobResult,
  ProofProgress,
} from './protocol';

type Port = {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(
    type: 'message',
    listener: (event: { data: unknown }) => void,
  ): void;
};
type WorkerHandle = Port & {
  addEventListener(
    type: 'error' | 'messageerror',
    listener: (event: { message?: string }) => void,
  ): void;
  terminate(): void;
};
type Frame = { id: number } & (
  | { kind: 'error'; error: string }
  | { kind: 'progress'; progress: ProofProgress }
  | { kind: 'result'; result: JobResult }
);

/** Owns one worker. Failure invalidates all pending requests; no in-thread fallback. */
export const createProofWorker = (worker: WorkerHandle) => {
  let nextId = 0;
  let failure: Error | undefined;
  const pending = new Map<
    number,
    {
      resolve: (result: JobResult) => void;
      reject: (error: Error) => void;
      progress: (value: ProofProgress) => void;
    }
  >();
  const dispose = (reason = 'Proof worker stopped') => {
    if (failure) return;
    failure = new Error(reason);
    for (const job of pending.values()) job.reject(failure);
    pending.clear();
    worker.terminate();
  };
  worker.addEventListener('error', event => {
    // Keep the browser's diagnostic, not its arbitrary error object or source URL.
    const detail = event.message
      ?.replace(/\b(?:https?|wss?|file|chrome-extension):\/\/\S+/gi, '[URL]')
      .slice(0, 256)
      .trim();
    dispose(detail ? `Proof worker failed: ${detail}` : 'Proof worker failed');
  });
  worker.addEventListener('messageerror', () => {
    dispose('Proof worker sent an unreadable result');
  });
  worker.addEventListener('message', event => {
    const frame = event.data as Frame;
    const job = pending.get(frame.id);
    if (!job) return;
    if (frame.kind === 'progress') {
      job.progress(frame.progress);
      return;
    }
    pending.delete(frame.id);
    if (frame.kind === 'error') job.reject(new Error(frame.error));
    else job.resolve(frame.result);
  });
  return {
    dispose,
    run: async (
      request: JobRequest,
      progress: (value: ProofProgress) => void,
    ): Promise<JobResult> => {
      if (failure) return Promise.reject(failure);
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject, progress });
        try {
          // The retained cache owns its bytes. Transfer owned copies so neither
          // cached keys nor caller buffers are detached or exposed to mutation.
          const circuit = {
            ...request.circuit,
            serializedPreimage: request.circuit.serializedPreimage.slice(),
            ...(request.circuit.keyMaterial
              ? {
                  keyMaterial: {
                    proverKey: request.circuit.keyMaterial.proverKey.slice(),
                    verifierKey:
                      request.circuit.keyMaterial.verifierKey.slice(),
                    ir: request.circuit.keyMaterial.ir.slice(),
                  },
                }
              : {}),
          };
          const buffers = [circuit.serializedPreimage.buffer];
          if (circuit.keyMaterial)
            buffers.push(
              ...Object.values(circuit.keyMaterial).map(
                bytes => bytes.buffer as ArrayBuffer,
              ),
            );
          worker.postMessage({ id, request: { ...request, circuit } }, buffers);
        } catch {
          dispose('Could not send proof request to worker');
        }
      });
    },
  };
};

/** Install the listener before importing WASM so the first request is not lost. */
export const serveProofWorker = (
  port: Port,
  load: () => Promise<
    (progress: (event: ProofProgress) => void) => CircuitProvider
  >,
): void => {
  let factory: ReturnType<typeof load> | undefined;
  port.addEventListener('message', event => {
    const { id, request } = event.data as { id: number; request: JobRequest };
    void (async () => {
      try {
        const createProvider = await (factory ??= load());
        const provider = createProvider(progress => {
          port.postMessage({ id, kind: 'progress', progress });
        });
        const result = await executeCircuit(provider, request, {
          report: progress => {
            port.postMessage({ id, kind: 'progress', progress });
          },
        });
        // Providers may retain the backing buffer or return a WASM heap view.
        // Transfer only an owned copy of the proof bytes.
        const reply =
          result instanceof Uint8Array ? new Uint8Array(result) : result;
        port.postMessage(
          { id, kind: 'result', result: reply },
          reply instanceof Uint8Array ? [reply.buffer] : [],
        );
      } catch (error) {
        port.postMessage({
          id,
          kind: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  });
};
