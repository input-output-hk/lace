import {
  createMockDependencies,
  FIXTURE_CONFIG,
} from '@input-output-hk/temenos-attestation-verifier/mocks';
import { MidnightSDKNetworkIds } from '@lace-contract/midnight-context';
import { describe, expect, it, vi } from 'vitest';

import {
  createAttestedProofServerAccess,
  ProofOperationUnavailableError,
} from '../../src/store/attested-proving-service';
import {
  createStoreTemenosAttestedProver,
  TemenosAttestationError,
} from '../../src/store/temenos-attested-prover';

import type {
  AttestedProverProvider,
  AttestedProvingSession,
} from '../../src/store/attested-proving-service';
import type {
  AttestationPhaseId,
  AttestationProgressEvent,
} from '@lace-contract/midnight-context';

const TEMENOS_PROOF_SERVER_URL = 'https://api.proofserver.wastedp.io';

const checkPayload = new Uint8Array([0xc0]);
const provePayload = new Uint8Array([0xf0]);
const proveResponse = new Uint8Array([0xf1]);

const ATTESTATION_PHASES: AttestationPhaseId[] = [
  'obtain-evidence',
  'fetch-expected-values',
  'verify-locally',
  'warden-verify',
  'bind-channel',
];

/**
 * The real driver over the verifier library's mock pipeline: the same code
 * production runs, with network and crypto replaced by the library's own
 * fixtures and failure knobs.
 */
const createAccess = () => {
  const dependencies = createMockDependencies({ latencyMs: 0 });
  const events: AttestationProgressEvent[] = [];
  const access = createAttestedProofServerAccess(
    createStoreTemenosAttestedProver(
      {
        networkId: MidnightSDKNetworkIds.PreProd,
        proofServerApiUrl: TEMENOS_PROOF_SERVER_URL,
        getLedgerIndexerUrl: async () => FIXTURE_CONFIG.indexerUrl,
        trustRoots: { amdRootCertificates: FIXTURE_CONFIG.amdRootCertificates },
      },
      {
        dependencies,
        config: FIXTURE_CONFIG,
      },
    ),
    event => events.push(event),
  );
  return { access, dependencies, events };
};

const phaseEvents = (events: AttestationProgressEvent[]) =>
  events.flatMap(event =>
    event.type === 'phase' ? [`${event.phase}:${event.status}`] : [],
  );

const checkResults = (events: AttestationProgressEvent[]) =>
  events.flatMap(event => (event.type === 'check' ? [event.check] : []));

const proveCalls = ({
  dependencies,
}: ReturnType<typeof createAccess>): number =>
  dependencies.channelBinder.channels.reduce(
    (total, channel) => total + channel.proveCalls,
    0,
  );

describe('createAttestedProofServerAccess', () => {
  it('runs all attestation phases in order, then forwards the payload through the attested channel', async () => {
    const context = createAccess();
    const { access, events } = context;

    const result = await access.transport.prove(provePayload);

    // The mock channel echoes the payload length, proving the bytes crossed it.
    expect(JSON.parse(new TextDecoder().decode(result))).toMatchObject({
      echoBytes: provePayload.length,
    });
    expect(proveCalls(context)).toBe(1);
    expect(events[0]).toEqual({
      type: 'reset',
      steps: [...ATTESTATION_PHASES, 'proving'],
    });
    expect(phaseEvents(events)).toEqual([
      'obtain-evidence:started',
      'obtain-evidence:completed',
      'fetch-expected-values:started',
      'fetch-expected-values:completed',
      'verify-locally:started',
      'verify-locally:completed',
      'warden-verify:started',
      'warden-verify:completed',
      'bind-channel:started',
      'bind-channel:completed',
      'proving:started',
      'proving:completed',
    ]);
    expect(checkResults(events).length).toBeGreaterThanOrEqual(8);
    expect(checkResults(events).every(check => check.status === 'passed')).toBe(
      true,
    );
  });

  it('refuses /check before attesting or contacting anything — the payload carries the preimage', async () => {
    const establishAttestedSession = vi.fn();
    const access = createAttestedProofServerAccess(
      {
        id: 'fixture',
        operations: ['prove'],
        phases: [],
        establishAttestedSession,
      },
      () => {
        throw new Error('no progress expected');
      },
    );

    await expect(access.transport.check(checkPayload)).rejects.toBeInstanceOf(
      ProofOperationUnavailableError,
    );
    expect(establishAttestedSession).not.toHaveBeenCalled();
  });

  const failures: Array<
    [AttestationPhaseId, (context: ReturnType<typeof createAccess>) => void]
  > = [
    [
      'obtain-evidence',
      ({ dependencies }) => {
        dependencies.evidenceProvider.obtainEvidence = async () => {
          throw new Error('attestation host unreachable');
        };
      },
    ],
    [
      'fetch-expected-values',
      ({ dependencies }) => {
        dependencies.ledgerClient.simulateRevoked = true;
      },
    ],
    [
      'verify-locally',
      ({ dependencies }) => {
        dependencies.localVerifier.failCheck = 'pcr15-recompute';
      },
    ],
    [
      'warden-verify',
      ({ dependencies }) => {
        dependencies.wardenClient.simulateRejection = true;
      },
    ],
    [
      'bind-channel',
      ({ dependencies }) => {
        dependencies.channelBinder.simulateBindingFailure = true;
      },
    ],
  ];

  it.each(failures)(
    'fails closed when phase "%s" fails: no payload is sent',
    async (phase, inject) => {
      const context = createAccess();
      inject(context);
      const { access, events } = context;

      await expect(access.transport.prove(provePayload)).rejects.toThrow(
        TemenosAttestationError,
      );
      await expect(access.transport.prove(provePayload)).rejects.toMatchObject({
        phase,
      });
      expect(proveCalls(context)).toBe(0);
      expect(phaseEvents(events)).toContain(`${phase}:failed`);
      expect(phaseEvents(events)).not.toContain('proving:started');
    },
  );

  it.each(['silent', 'started', 'failed'] as const)(
    'terminates establishment progress when the provider rejects after %s reporting',
    async reporting => {
      const events: AttestationProgressEvent[] = [];
      const error = new Error('establishment failed');
      const phase = reporting === 'silent' ? 'obtain-evidence' : 'bind-channel';
      const access = createAttestedProofServerAccess(
        {
          id: 'fixture',
          operations: ['prove'],
          phases: ATTESTATION_PHASES,
          establishAttestedSession: async emit => {
            if (reporting !== 'silent')
              emit({
                type: 'phase',
                phase,
                status: reporting,
                detail: error.message,
              });
            throw error;
          },
        },
        event => events.push(event),
      );
      await expect(access.transport.prove(provePayload)).rejects.toBe(error);
      expect(
        events.filter(
          event => event.type === 'phase' && event.status === 'failed',
        ),
      ).toEqual([
        { type: 'phase', phase, status: 'failed', detail: error.message },
      ]);
      expect(phaseEvents(events)).not.toContain('proving:started');
      expect(events.at(-1)).toMatchObject({
        type: 'phase',
        phase,
        status: 'failed',
      });
    },
  );

  it('reports the failed local check and aborts before Warden and proving', async () => {
    const context = createAccess();
    context.dependencies.localVerifier.failCheck = 'pcr15-recompute';
    const { access, events } = context;

    await expect(access.transport.prove(provePayload)).rejects.toMatchObject({
      phase: 'verify-locally',
      checkId: 'pcr15-recompute',
    });
    expect(proveCalls(context)).toBe(0);
    expect(checkResults(events)).toContainEqual(
      expect.objectContaining({ id: 'pcr15-recompute', status: 'failed' }),
    );
    expect(phaseEvents(events)).not.toContain('warden-verify:started');
  });

  describe('with a driver-provided session', () => {
    const createSession = (): AttestedProvingSession & {
      prove: ReturnType<typeof vi.fn>;
      close: ReturnType<typeof vi.fn>;
    } => ({
      prove: vi.fn().mockResolvedValue(proveResponse),
      close: vi.fn().mockResolvedValue(undefined),
    });

    it('emits a failed proving step and propagates the error when the session rejects', async () => {
      const session = createSession();
      const proveError = new Error('proof server unreachable');
      session.prove.mockRejectedValue(proveError);
      const events: AttestationProgressEvent[] = [];
      const access = createAttestedProofServerAccess(
        {
          id: 'fixture',
          operations: ['prove'],
          phases: [],
          establishAttestedSession: vi.fn().mockResolvedValue(session),
        },
        event => events.push(event),
      );

      await expect(access.transport.prove(provePayload)).rejects.toBe(
        proveError,
      );
      expect(events.at(-1)).toEqual({
        type: 'phase',
        phase: 'proving',
        status: 'failed',
        detail: 'proof server unreachable',
      });
    });

    it('re-runs attestation for every use — verification is never cached', async () => {
      const session = createSession();
      const establishAttestedSession = vi.fn().mockResolvedValue(session);
      const driver: AttestedProverProvider = {
        id: 'fixture',
        operations: ['prove'],
        phases: [],
        establishAttestedSession,
      };
      const access = createAttestedProofServerAccess(driver, () => undefined);

      await access.transport.prove(provePayload);
      await access.transport.prove(provePayload);

      expect(establishAttestedSession).toHaveBeenCalledTimes(2);
      expect(session.prove).toHaveBeenCalledTimes(2);
    });

    it('closes the session after each use, including a failed one', async () => {
      const session = createSession();
      session.prove.mockRejectedValueOnce(new Error('boom'));
      const driver: AttestedProverProvider = {
        id: 'fixture',
        operations: ['prove'],
        phases: [],
        establishAttestedSession: vi.fn().mockResolvedValue(session),
      };
      const access = createAttestedProofServerAccess(driver, () => undefined);

      await expect(access.transport.prove(provePayload)).rejects.toThrow(
        'boom',
      );
      await access.transport.prove(provePayload);

      expect(session.close).toHaveBeenCalledTimes(2);
    });

    it('wraps the session as the SDK proving service for the wallet transaction', async () => {
      const session = createSession();
      const driver: AttestedProverProvider = {
        id: 'fixture',
        operations: ['prove'],
        phases: [],
        establishAttestedSession: vi.fn().mockResolvedValue(session),
      };
      const access = createAttestedProofServerAccess(driver, () => undefined);
      const prove = vi.fn().mockResolvedValue('proven');
      const transaction = { prove } as unknown as Parameters<
        typeof access.provingService.prove
      >[0];

      await expect(access.provingService.prove(transaction)).resolves.toBe(
        'proven',
      );
      // The SDK drives the circuit-level provider the session is adapted
      // into; it must be the session, not any other transport.
      const [provider] = prove.mock.calls[0] as [
        { prove: (...args: unknown[]) => Promise<Uint8Array> },
      ];
      expect(typeof provider.prove).toBe('function');
      expect(session.close).toHaveBeenCalledTimes(1);
    });
  });
});

describe('provider-neutral session contract', () => {
  const makeProvider = () => {
    const close = vi.fn().mockResolvedValue(undefined);
    const prove = vi.fn().mockResolvedValue(proveResponse);
    const check = vi.fn().mockResolvedValue(new Uint8Array([7]));
    const establishAttestedSession = vi.fn(
      async (emit: (event: AttestationProgressEvent) => void) => {
        emit({
          type: 'phase',
          phase: 'example:appraise-evidence',
          status: 'completed',
        });
        emit({
          type: 'check',
          check: {
            id: 'example:measurement',
            phase: 'example:appraise-evidence',
            status: 'passed',
          },
        });
        return { prove, check, close };
      },
    );
    const provider: AttestedProverProvider = {
      id: 'example-provider',
      operations: ['prove', 'check'],
      phases: ['example:appraise-evidence'],
      establishAttestedSession,
    };
    return { provider, establishAttestedSession, prove, check, close };
  };

  it('supports another provider vocabulary and check over its bound session', async () => {
    const fixture = makeProvider();
    const events: AttestationProgressEvent[] = [];
    const access = createAttestedProofServerAccess(fixture.provider, event =>
      events.push(event),
    );
    await expect(access.transport.check(checkPayload)).resolves.toEqual(
      new Uint8Array([7]),
    );
    expect(fixture.check).toHaveBeenCalledWith(checkPayload, undefined);
    expect(fixture.prove).not.toHaveBeenCalled();
    expect(fixture.close).toHaveBeenCalledTimes(1);
    expect(events[0]).toEqual({
      type: 'reset',
      steps: ['example:appraise-evidence', 'checking'],
    });
    expect(events.at(-1)).toEqual({
      type: 'phase',
      phase: 'checking',
      status: 'completed',
    });
    await access.transport.prove(provePayload);
    expect(fixture.establishAttestedSession).toHaveBeenCalledTimes(2);
    expect(fixture.close).toHaveBeenCalledTimes(2);
  });

  it('refuses an advertised check if the established session cannot securely provide it', async () => {
    const fixture = makeProvider();
    const session = { prove: fixture.prove, close: fixture.close };
    fixture.provider.establishAttestedSession = async () => session;
    const access = createAttestedProofServerAccess(
      fixture.provider,
      () => undefined,
    );
    await expect(access.transport.check(checkPayload)).rejects.toBeInstanceOf(
      ProofOperationUnavailableError,
    );
    expect(fixture.prove).not.toHaveBeenCalled();
    expect(fixture.close).toHaveBeenCalledTimes(1);
  });

  it('closes an established channel even when reporting operation progress throws', async () => {
    const fixture = makeProvider();
    const access = createAttestedProofServerAccess(fixture.provider, event => {
      if (
        event.type === 'phase' &&
        event.phase === 'proving' &&
        event.status === 'started'
      )
        throw new Error('progress observer failed');
    });
    await expect(access.transport.prove(provePayload)).rejects.toThrow(
      'progress observer failed',
    );
    expect(fixture.prove).not.toHaveBeenCalled();
    expect(fixture.close).toHaveBeenCalledTimes(1);
  });
});

it.each(['establishing', 'proving'] as const)(
  'closes a cancelled attested session while %s',
  async stage => {
    const abort = new AbortController();
    let finishSetup!: () => void;
    let beginProving!: () => void;
    const proving = new Promise<void>(resolve => {
      beginProving = resolve;
    });
    const close = vi.fn(async () => {});
    const prove = vi.fn(async (_payload: Uint8Array, signal?: AbortSignal) => {
      beginProving();
      return new Promise<Uint8Array>((_resolve, reject) => {
        signal!.addEventListener(
          'abort',
          () => {
            reject(new Error('Proof cancelled'));
          },
          {
            once: true,
          },
        );
      });
    });
    const access = createAttestedProofServerAccess(
      {
        id: 'test',
        phases: [],
        operations: ['prove'],
        establishAttestedSession: async (_progress, signal) => {
          expect(signal).toBe(abort.signal);
          await new Promise<void>(resolve => {
            finishSetup = resolve;
          });
          return { prove, close };
        },
      },
      () => {},
    );
    const result = access.transport.prove(provePayload, abort.signal);
    const rejected = expect(result).rejects.toThrow('Proof cancelled');
    if (stage === 'proving') {
      finishSetup();
      await proving;
    }
    abort.abort(new Error('Proof cancelled'));
    if (stage === 'establishing') finishSetup();
    await rejected;
    expect(close).toHaveBeenCalledTimes(1);
    expect(prove).toHaveBeenCalledTimes(stage === 'proving' ? 1 : 0);
  },
);
