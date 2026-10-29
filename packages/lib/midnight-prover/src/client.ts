import { createByteClient } from './bytes';
import { decodeResult, encodeRequest } from './protocol';

import type { ProofJobObserver } from './activity';
import type {
  CircuitProvider,
  JobRequest,
  JobResult,
  ProofProgress,
  ProverCommand,
  ProverReply,
} from './protocol';

/** The transport must bound each message, not the duration of proof computation. */
export const createProverClient = ({
  ensure,
  send,
  release,
  intervalMs = 500,
}: {
  ensure: () => Promise<void>;
  send: (command: ProverCommand) => Promise<ProverReply>;
  release: () => Promise<void>;
  intervalMs?: number;
}) => {
  // SDK transactions request several circuits concurrently. Serialize material
  // transfers across providers so they cannot exhaust the receiver's upload slots.
  let preparing: Promise<unknown> = Promise.resolve();
  const prepare = async <T>(task: () => Promise<T>): Promise<T> => {
    const result = preparing.then(task);
    preparing = result.catch(() => undefined);
    return result;
  };
  return {
    provider: (
      onProgress?: (progress: ProofProgress) => void,
      signal?: AbortSignal,
      onJobChange?: ProofJobObserver,
    ): CircuitProvider & Required<Pick<CircuitProvider, 'checkAndProve'>> => {
      const run = async (
        request: JobRequest,
        callSignal?: AbortSignal,
      ): Promise<JobResult> => {
        const isCancelled = () => signal?.aborted || callSignal?.aborted;
        const id = crypto.randomUUID();
        const command = (
          operation: 'cancel' | 'poll' | 'release',
        ): ProverCommand => ({
          target: 'lace:prover',
          version: 2,
          id,
          operation,
        });
        const bytes = createByteClient(async operation => {
          if (isCancelled()) throw new Error('Proof cancelled');
          const reply = await send({
            target: 'lace:prover',
            version: 2,
            id,
            ...operation,
          });
          if (!reply.ok) throw new Error(reply.error);
          if (!('bytes' in reply))
            throw new Error('Invalid proof material response');
          return reply.bytes;
        });
        await ensure();
        let hasStarted = false;
        let lastProgress = '';
        let lastStatus = '';
        let lastStage = '';
        try {
          let reply = await prepare(async () => {
            if (isCancelled()) throw new Error('Proof cancelled');
            // The caller supplies the ID, making a repeated start idempotent.
            hasStarted = true;
            const begun = await send({
              target: 'lace:prover',
              version: 2,
              id,
              operation: 'begin',
              method: request.method,
            });
            if (!begun.ok) throw new Error(begun.error);
            return send({
              target: 'lace:prover',
              version: 2,
              id,
              operation: 'start',
              request: await encodeRequest(request, bytes.upload),
            });
          });
          for (;;) {
            if (isCancelled()) throw new Error('Proof cancelled');
            if (!reply.ok) throw new Error(reply.error);
            if (!('job' in reply))
              throw new Error('Invalid proof job response');
            const { job } = reply;
            const stageKey = JSON.stringify(job.stage);
            if (job.status !== lastStatus || stageKey !== lastStage) {
              lastStatus = job.status;
              lastStage = stageKey;
              onJobChange?.(id, job.status, job.stage);
            }
            const progressKey = JSON.stringify(job.progress);
            if (job.progress && progressKey !== lastProgress) {
              lastProgress = progressKey;
              onProgress?.(job.progress);
            }
            if (job.status === 'succeeded' && job.result)
              return await decodeResult(job.result, bytes.download);
            if (job.status === 'failed' || job.status === 'cancelled')
              throw new Error(job.error ?? 'Proof failed');
            await new Promise(resolve => setTimeout(resolve, intervalMs));
            reply = await send(command('poll'));
          }
        } catch (error) {
          onJobChange?.(id, 'failed');
          throw error;
        } finally {
          if (hasStarted) {
            await send(command('cancel')).catch(() => undefined);
            await send(command('release')).catch(() => undefined);
          }
          await release();
        }
      };
      return {
        checkAndProve: async (circuit, callSignal) =>
          (await run(
            { method: 'checkAndProve', circuit },
            callSignal,
          )) as Uint8Array,
        check: async (circuit, callSignal) =>
          (await run({ method: 'check', circuit }, callSignal)) as (
            | bigint
            | undefined
          )[],
        prove: async (circuit, callSignal) =>
          (await run({ method: 'prove', circuit }, callSignal)) as Uint8Array,
      };
    },
  };
};
