import {
  createProvingServiceFromTransport,
  createCircuitProviderFromTransport,
} from './proof-server-transport';

import type {
  AttestationProgressEvent,
  ProofServerTransport,
} from './midnight-proof-servers';
import type { ProofServerAccess } from './proof-server-transport';

export type ProofOperation = keyof ProofServerTransport;
export type AttestationFailureStage =
  | 'appraisal'
  | 'channel'
  | 'evidence'
  | 'policy';

/** Common diagnostic categories; providers retain their own error details. */
export class AttestationError extends Error {
  public constructor(
    readonly providerId: string,
    readonly stage: AttestationFailureStage,
    message: string,
  ) {
    super(message);
    this.name = 'AttestationError';
  }
}

export class ProofOperationUnavailableError extends Error {
  public constructor(
    readonly providerId: string,
    readonly operation: ProofOperation,
  ) {
    super(`/${operation} is not available for attested prover "${providerId}"`);
    this.name = 'ProofOperationUnavailableError';
  }
}

/**
 * Usable only after evidence appraisal, application-policy acceptance and
 * channel binding. This is an application capability, not a RATS Attestation
 * Result. All supplied operations use the accepted, bound channel.
 */
export type AttestedProvingSession = Partial<
  Pick<ProofServerTransport, 'check'>
> &
  Pick<ProofServerTransport, 'prove'> & {
    close: () => Promise<void>;
  };

/**
 * An admitted implementation, constructed with trusted configuration by the
 * host/monolith. Evidence formats, appraisal and binding protocols belong to
 * the implementation; root selection belongs to the instantiator. Never
 * return a payload transport before acceptance and binding both succeed.
 */
export type AttestedProverProvider = {
  id: string;
  phases: readonly string[];
  operations: readonly ProofOperation[];
  establishAttestedSession: (
    onEvent: (event: AttestationProgressEvent) => void,
    signal?: AbortSignal,
  ) => Promise<AttestedProvingSession>;
};

/**
 * SDK and dApp access share the same session lifecycle. Establish anew for
 * each operation, never fall back to another transport, and always close a
 * successfully established session. Unsupported operations fail before any
 * attestation/network activity.
 */
export const createAttestedProofServerAccess = (
  provider: AttestedProverProvider,
  onProgress: (event: AttestationProgressEvent) => void,
): ProofServerAccess & { transport: ProofServerTransport } => {
  const requireOperation = (operation: ProofOperation) => {
    if (!provider.operations.includes(operation))
      throw new ProofOperationUnavailableError(provider.id, operation);
  };
  const attested = async <T>(
    operation: ProofOperation,
    use: (session: AttestedProvingSession) => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> => {
    signal?.throwIfAborted();
    requireOperation(operation);
    const phase = operation === 'prove' ? 'proving' : 'checking';
    onProgress({ type: 'reset', steps: [...provider.phases, phase] });
    let session: AttestedProvingSession | undefined;
    let currentPhase = provider.phases[0] ?? phase;
    let hasReportedFailure = false;
    const reportProgress = (event: AttestationProgressEvent) => {
      if (event.type === 'phase') {
        currentPhase = event.phase;
        if (event.status === 'failed') hasReportedFailure = true;
      }
      onProgress(event);
    };
    try {
      session = await provider.establishAttestedSession(reportProgress, signal);
      signal?.throwIfAborted();
      currentPhase = phase;
      onProgress({ type: 'phase', phase, status: 'started' });
      const result = await use(session);
      onProgress({ type: 'phase', phase, status: 'completed' });
      return result;
    } catch (error) {
      // Providers may reject before emitting a failure (including during
      // setup). Finish the checklist without duplicating provider diagnostics.
      if (!hasReportedFailure)
        onProgress({
          type: 'phase',
          phase: currentPhase,
          status: 'failed',
          detail: error instanceof Error ? error.message : undefined,
        });
      throw error;
    } finally {
      await session?.close().catch(() => undefined);
    }
  };
  const checkSession = async (
    session: AttestedProvingSession,
    payload: Uint8Array,
    signal?: AbortSignal,
  ) => {
    requireOperation('check');
    if (!session.check)
      throw new ProofOperationUnavailableError(provider.id, 'check');
    return session.check(payload, signal);
  };
  const transport: ProofServerTransport = {
    check: async (payload, signal) =>
      attested(
        'check',
        async session => checkSession(session, payload, signal),
        signal,
      ),
    prove: async (payload, signal) =>
      attested(
        'prove',
        async session => session.prove(payload, signal),
        signal,
      ),
  };
  const circuits = createCircuitProviderFromTransport(transport);
  return {
    circuits: {
      ...circuits,
      // The connector's optional preflight must not prevent prove-only servers
      // from proving. Explicit check() still rejects without sending any data.
      ...(!provider.operations.includes('check') && {
        checkAndProve: circuits.prove,
      }),
    },
    provingService: {
      prove: async transaction =>
        attested('prove', async session =>
          createProvingServiceFromTransport({
            check: async payload => checkSession(session, payload),
            prove: async payload => session.prove(payload),
          }).prove(transaction),
        ),
    },
    transport,
  };
};
