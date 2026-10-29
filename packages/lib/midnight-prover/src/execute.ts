import type {
  CircuitProvider,
  JobRequest,
  JobResult,
  ProofStage,
} from './protocol';

/** The combined operation owns one queue slot and stops if checking fails. */
export const executeCircuit = async (
  provider: CircuitProvider,
  request: JobRequest,
  {
    report = () => {},
    signal,
  }: { report?: (stage: ProofStage) => void; signal?: AbortSignal } = {},
): Promise<JobResult> => {
  signal?.throwIfAborted();
  if (request.method !== 'checkAndProve')
    return provider[request.method](request.circuit, signal);
  if (provider.checkAndProve)
    return provider.checkAndProve(request.circuit, signal);
  report({ phase: 'checking', status: 'started' });
  await provider.check(request.circuit, signal);
  signal?.throwIfAborted();
  report({ phase: 'checking', status: 'completed' });
  report({ phase: 'proving', status: 'started' });
  const proof = await provider.prove(request.circuit, signal);
  report({ phase: 'proving', status: 'completed' });
  return proof;
};
