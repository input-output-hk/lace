import { createByteStore } from './bytes';
import { executeCircuit } from './execute';
import { decodeRequest, encodeResult } from './protocol';

import type { ByteOperation } from './bytes';
import type {
  CircuitProvider,
  JobRequest,
  JobSnapshot,
  ProverCommand,
  ProverReply,
} from './protocol';
import type { createProofWorker } from './worker';

type Record = {
  owner: string;
  cancellation: AbortController;
  provider?: CircuitProvider;
  snapshot: JobSnapshot;
  request?: JobRequest;
  expires?: number;
  method?: JobRequest['method'];
  failPreparation?: () => void;
  uploadTimer?: ReturnType<typeof setTimeout>;
};
/** The document owns jobs and results, independently of service-worker promises. */
export const createProofJobs = ({
  createWorker,
  now = Date.now,
  retentionMs = 300_000,
  capacity = 8,
  idleMs = 30_000,
  byteLimits,
  shouldForwardProvidersConcurrently = false,
}: {
  createWorker?: () => ReturnType<typeof createProofWorker>;
  now?: () => number;
  retentionMs?: number;
  capacity?: number;
  idleMs?: number;
  byteLimits?: Parameters<typeof createByteStore>[0];
  /** Forward async providers to their own scheduler; native worker jobs remain serial. */
  shouldForwardProvidersConcurrently?: boolean;
}) => {
  const bytes = createByteStore({ now, ...byteLimits });
  const key = (owner: string, id: string) => JSON.stringify([owner, id]);
  const jobs = new Map<string, Record>();
  const active = new Set<Record>();
  let worker: ReturnType<typeof createProofWorker> | undefined;
  let idleUntil = 0;
  const sweep = () => {
    for (const [id, record] of jobs)
      if (record.expires !== undefined && record.expires <= now()) {
        clearTimeout(record.uploadTimer);
        record.failPreparation?.();
        bytes.release(record.owner, record.snapshot.id);
        jobs.delete(id);
      }
    bytes.sweep();
    if (!jobs.size && !active.size && now() >= idleUntil) {
      worker?.dispose();
      worker = undefined;
    }
  };
  const touchUpload = (record: Record) => {
    clearTimeout(record.uploadTimer);
    record.expires = now() + 60_000;
    record.uploadTimer = setTimeout(() => {
      if (record.snapshot.status !== 'receiving') return;
      finish(record, 'failed', 'Proof material upload timed out');
      bytes.release(record.owner, record.snapshot.id);
    }, 60_000);
  };
  const finish = (
    record: Record,
    status: JobSnapshot['status'],
    error?: string,
  ) => {
    clearTimeout(record.uploadTimer);
    if (
      record.snapshot.status === 'receiving' ||
      record.snapshot.status === 'queued'
    )
      record.failPreparation?.();
    record.snapshot.status = status;
    record.snapshot.error = error;
    record.request = undefined;
    record.expires = now() + retentionMs;
  };
  const pump = () => {
    const record = [...jobs.values()].find(
      job => job.snapshot.status === 'queued',
    );
    if (
      !record?.request ||
      (active.size > 0 &&
        (!shouldForwardProvidersConcurrently || !record.provider))
    )
      return;
    active.add(record);
    record.snapshot.status = 'running';
    void (async () => {
      try {
        const result = record.provider
          ? await executeCircuit(record.provider, record.request!, {
              report: stage => {
                record.snapshot.stage = stage;
              },
              signal: record.cancellation.signal,
            })
          : await (worker ??= createWorker!()).run(
              record.request!,
              progress => {
                record.snapshot.progress = progress;
                if (progress.phase !== 'proof-material')
                  record.snapshot.stage = progress;
              },
            );
        if (record.snapshot.status === 'running') {
          const encoded = await encodeResult(result, async value =>
            bytes.storeResult(record.owner, record.snapshot.id, value),
          );
          if (record.snapshot.status === 'running') {
            record.snapshot.result = encoded;
            finish(record, 'succeeded');
          }
        }
      } catch (error) {
        if (!record.provider) {
          worker?.dispose();
          worker = undefined;
        }
        if (record.snapshot.status === 'running')
          finish(
            record,
            'failed',
            error instanceof Error ? error.message : String(error),
          );
      } finally {
        // Inputs stay pinned through computation, including cancellation races.
        if (record.snapshot.status === 'cancelled')
          bytes.release(record.owner, record.snapshot.id);
        active.delete(record);
        idleUntil = now() + idleMs;
        pump();
      }
    })();
    if (shouldForwardProvidersConcurrently && record.provider) pump();
  };
  return {
    isActive: () => {
      sweep();
      return (
        jobs.size > 0 ||
        active.size > 0 ||
        worker !== undefined ||
        bytes.isActive()
      );
    },
    handle: async (
      command: ProverCommand,
      owner = 'extension',
      provider?: CircuitProvider,
    ): Promise<ProverReply> => {
      try {
        sweep();
        if (
          command.version !== 2 ||
          command.target !== 'lace:prover' ||
          typeof command.id !== 'string' ||
          !command.id ||
          command.id.length > 128
        )
          throw new Error('Invalid proof job command');
        const recordKey = key(owner, command.id);
        let record = jobs.get(recordKey);
        if (command.operation === 'begin') {
          if (
            command.method !== 'check' &&
            command.method !== 'prove' &&
            command.method !== 'checkAndProve'
          )
            throw new Error('Invalid proof method');
          if (!record) {
            if (jobs.size >= capacity) throw new Error('Proof queue is full');
            const preparation = provider?.prepare?.(command.method);
            record = {
              owner,
              cancellation: new AbortController(),
              provider: preparation?.provider ?? provider,
              failPreparation: preparation?.fail,
              method: command.method,
              snapshot: { id: command.id, status: 'receiving' },
            };
            jobs.set(recordKey, record);
          } else if (record.method !== command.method) {
            throw new Error('Proof method changed during upload');
          }
          if (record.snapshot.status === 'receiving') touchUpload(record);
          return { ok: true, job: { ...record.snapshot, result: undefined } };
        }
        if (['upload', 'chunk', 'commit', 'read'].includes(command.operation)) {
          if (command.operation !== 'read' && record?.method) {
            if (record.snapshot.status !== 'receiving')
              throw new Error('Proof material upload has ended');
            touchUpload(record);
          }
          return {
            ok: true,
            bytes: await bytes.handle(
              command as ByteOperation & ProverCommand,
              owner,
              command.id,
            ),
          };
        }
        if (command.operation === 'release' && !record) {
          bytes.release(owner, command.id);
          return { ok: true, job: { id: command.id, status: 'cancelled' } };
        }
        if (
          command.operation === 'start' &&
          record?.snapshot.status === 'receiving'
        ) {
          if (record.method !== command.request.method)
            throw new Error('Proof method changed during upload');
          record.request = decodeRequest(command.request, references =>
            bytes.pin(owner, command.id, references),
          );
          clearTimeout(record.uploadTimer);
          record.expires = undefined;
          record.snapshot.status = 'queued';
          pump();
        }
        if (command.operation === 'start' && !record) {
          if (jobs.size >= capacity) throw new Error('Proof queue is full');
          record = {
            owner,
            cancellation: new AbortController(),
            provider,
            snapshot: { id: command.id, status: 'queued' },
            request: decodeRequest(command.request, references =>
              bytes.pin(owner, command.id, references),
            ),
          };
          jobs.set(recordKey, record);
          pump();
        }
        if (!record) throw new Error('Proof job is no longer available');
        if (
          command.operation === 'cancel' &&
          (record.snapshot.status === 'receiving' ||
            record.snapshot.status === 'queued' ||
            record.snapshot.status === 'running')
        ) {
          finish(record, 'cancelled', 'Proof cancelled');
          record.cancellation.abort(new Error('Proof cancelled'));
          if (active.has(record) && !record.provider)
            worker?.dispose('Proof cancelled');
        } else if (command.operation === 'release') {
          if (
            record.snapshot.status === 'receiving' ||
            record.snapshot.status === 'queued' ||
            record.snapshot.status === 'running'
          )
            throw new Error('Cancel an active proof before releasing it');
          jobs.delete(recordKey);
          if (!active.has(record)) bytes.release(owner, command.id);
          sweep();
        } else if (
          command.operation !== 'start' &&
          command.operation !== 'poll' &&
          command.operation !== 'cancel'
        )
          throw new Error('Unknown proof job operation');
        // Results can be large; only poll returns the payload.
        return {
          ok: true,
          job: {
            ...record.snapshot,
            ...(command.operation === 'poll' ? {} : { result: undefined }),
          },
        };
      } catch (error) {
        const record = jobs.get(key(owner, command.id));
        if (record?.snapshot.status === 'receiving') {
          finish(record, 'failed', 'Proof material upload failed');
          bytes.release(owner, command.id);
        }
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
};
