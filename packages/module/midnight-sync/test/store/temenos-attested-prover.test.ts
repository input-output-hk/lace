import { RealLedgerClient } from '@input-output-hk/temenos-attestation-verifier';
import {
  createMockDependencies,
  FIXTURE_CONFIG,
} from '@input-output-hk/temenos-attestation-verifier/mocks';
import {
  MidnightSDKNetworkIds,
  TEMENOS_PROOF_SERVER_MODES,
} from '@lace-contract/midnight-context';
import { describe, expect, it, vi } from 'vitest';

import {
  createStoreTemenosAttestedProver,
  TemenosAttestationError,
} from '../../src/store/temenos-attested-prover';

import type { AttestationProgressEvent } from '@lace-contract/midnight-context';

const TEMENOS_PROOF_SERVER_URL = 'https://api.proofserver.wastedp.io';

const CONTRACT_CHECK_IDS = new Set([
  'ak-extraction',
  'epoch-key-binding',
  'pcr15-recompute',
  'pcrs-0-4-vs-record',
  'report-data-binding',
  'report-fields-vs-record',
  'snp-signature-chain',
  'tpm-quote-pcr-digest',
  'tpm-quote-signature',
]);

const createDriver = () => {
  const dependencies = createMockDependencies({ latencyMs: 0 });
  // FIXTURE_CONFIG must accompany the mock dependencies: the mock channel
  // binder validates the config's proof-server host against the fixture
  // evidence's webserver_tls endpoints (api.mock.local).
  const driver = createStoreTemenosAttestedProver(
    {
      networkId: MidnightSDKNetworkIds.PreProd,
      proofServerApiUrl: TEMENOS_PROOF_SERVER_URL,
      getLedgerIndexerUrl: async () => FIXTURE_CONFIG.indexerUrl,
      trustRoots: { amdRootCertificates: FIXTURE_CONFIG.amdRootCertificates },
    },
    { dependencies, config: FIXTURE_CONFIG },
  );
  const events: AttestationProgressEvent[] = [];
  const run = async () =>
    driver.establishAttestedSession(event => events.push(event));
  return { dependencies, driver, events, run };
};

const phaseEvents = (events: AttestationProgressEvent[]) =>
  events.flatMap(event =>
    event.type === 'phase' ? [`${event.phase}:${event.status}`] : [],
  );

describe('createStoreTemenosAttestedProver', () => {
  it('throws for a proof server that is not the one baked for the network', () => {
    expect(() =>
      createStoreTemenosAttestedProver({
        networkId: MidnightSDKNetworkIds.PreProd,
        proofServerApiUrl: 'https://unknown.example.com',
        getLedgerIndexerUrl: async () => FIXTURE_CONFIG.indexerUrl,
        trustRoots: { amdRootCertificates: FIXTURE_CONFIG.amdRootCertificates },
      }),
    ).toThrow(/no baked temenos attestation config/i);
  });

  it.each([MidnightSDKNetworkIds.QaNet])(
    'rejects ineligible network %s before attestation',
    networkId => {
      expect(() =>
        createStoreTemenosAttestedProver({
          networkId,
          proofServerApiUrl: TEMENOS_PROOF_SERVER_URL,
          getLedgerIndexerUrl: async () => FIXTURE_CONFIG.indexerUrl,
          trustRoots: {
            amdRootCertificates: FIXTURE_CONFIG.amdRootCertificates,
          },
        }),
      ).toThrow(/no baked temenos attestation config/i);
    },
  );

  it('bakes an attestation config for every network that offers the Temenos mode', () => {
    const networks = Object.keys(TEMENOS_PROOF_SERVER_MODES);
    expect(networks).toEqual(
      expect.arrayContaining([
        MidnightSDKNetworkIds.MainNet,
        MidnightSDKNetworkIds.PreProd,
        MidnightSDKNetworkIds.Preview,
      ]),
    );
    for (const [networkId, mode] of Object.entries(
      TEMENOS_PROOF_SERVER_MODES,
    )) {
      if (!mode) throw new Error('Missing Temenos mode');
      expect(() =>
        createStoreTemenosAttestedProver({
          networkId: networkId,
          proofServerApiUrl: mode.url,
          getLedgerIndexerUrl: async () => FIXTURE_CONFIG.indexerUrl,
          trustRoots: {
            amdRootCertificates: FIXTURE_CONFIG.amdRootCertificates,
          },
        }),
      ).not.toThrow();
    }
  });

  it('declares the AKX step plan', () => {
    const { driver } = createDriver();
    expect(driver.phases).toEqual([
      'obtain-evidence',
      'fetch-expected-values',
      'verify-locally',
      'warden-verify',
      'bind-channel',
    ]);
  });

  it('maps the pipeline phases in order and resolves to a prover', async () => {
    const { events, run } = createDriver();
    const prover = await run();

    expect(typeof prover.prove).toBe('function');
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
    ]);
  });

  it('maps per-check events onto contract check IDs only', async () => {
    const { events, run } = createDriver();
    await run();

    const checks = events.flatMap(event =>
      event.type === 'check' ? [event.check] : [],
    );
    expect(checks.length).toBeGreaterThanOrEqual(8);
    for (const check of checks) {
      expect(CONTRACT_CHECK_IDS.has(check.id)).toBe(true);
      expect(check.status).toBe('passed');
    }
  });

  it('maps a failed local check to a typed error, after emitting its failed check event', async () => {
    const { dependencies, events, run } = createDriver();
    dependencies.localVerifier.failCheck = 'pcr15-recompute';

    await expect(run()).rejects.toMatchObject({
      name: 'TemenosAttestationError',
      phase: 'verify-locally',
      checkId: 'pcr15-recompute',
    });
    const checks = events.flatMap(event =>
      event.type === 'check' ? [event.check] : [],
    );
    expect(checks).toContainEqual(
      expect.objectContaining({ id: 'pcr15-recompute', status: 'failed' }),
    );
    expect(phaseEvents(events)).toContain('verify-locally:failed');
  });

  it('maps a revoked registration to a fetch-expected-values failure', async () => {
    const { dependencies, run } = createDriver();
    dependencies.ledgerClient.simulateRevoked = true;

    await expect(run()).rejects.toMatchObject({
      phase: 'fetch-expected-values',
    });
    await expect(run()).rejects.toBeInstanceOf(TemenosAttestationError);
  });

  it('maps a Warden rejection to a warden-verify failure', async () => {
    const { dependencies, run } = createDriver();
    dependencies.wardenClient.simulateRejection = true;

    await expect(run()).rejects.toMatchObject({ phase: 'warden-verify' });
  });

  it('maps a channel-binding failure to a bind-channel failure', async () => {
    const { dependencies, events, run } = createDriver();
    dependencies.channelBinder.simulateBindingFailure = true;

    await expect(run()).rejects.toMatchObject({ phase: 'bind-channel' });
    expect(phaseEvents(events)).toContain('bind-channel:failed');
  });
});

describe('explicit trust-root input', () => {
  it('uses only the supplied root snapshot, even if the caller later changes its source', async () => {
    const dependencies = createMockDependencies({ latencyMs: 0 });
    const verify = vi.spyOn(dependencies.localVerifier, 'verify');
    const roots = ['caller-selected-root'];
    const provider = createStoreTemenosAttestedProver(
      {
        networkId: MidnightSDKNetworkIds.PreProd,
        proofServerApiUrl: TEMENOS_PROOF_SERVER_URL,
        getLedgerIndexerUrl: async () => FIXTURE_CONFIG.indexerUrl,
        trustRoots: { amdRootCertificates: roots },
      },
      { dependencies, config: FIXTURE_CONFIG },
    );
    roots.push('later-root');
    const session = await provider.establishAttestedSession(() => undefined);
    expect(verify).toHaveBeenCalled();
    expect(verify.mock.calls[0][2]).toEqual(['caller-selected-root']);
    await session.close();
  });

  it('rejects an empty trust set instead of using bundled roots implicitly', () => {
    expect(() =>
      createStoreTemenosAttestedProver({
        networkId: MidnightSDKNetworkIds.PreProd,
        proofServerApiUrl: TEMENOS_PROOF_SERVER_URL,
        getLedgerIndexerUrl: async () => FIXTURE_CONFIG.indexerUrl,
        trustRoots: { amdRootCertificates: [] },
      }),
    ).toThrow('requires explicit AMD trust roots');
  });

  it('propagates rejection under the supplied roots before establishing a channel', async () => {
    const dependencies = createMockDependencies({ latencyMs: 0 });
    dependencies.localVerifier.failCheck = 'snp-signature-chain';
    const bind = vi.spyOn(dependencies.channelBinder, 'bind');
    const provider = createStoreTemenosAttestedProver(
      {
        networkId: MidnightSDKNetworkIds.PreProd,
        proofServerApiUrl: TEMENOS_PROOF_SERVER_URL,
        getLedgerIndexerUrl: async () => FIXTURE_CONFIG.indexerUrl,
        trustRoots: { amdRootCertificates: ['unaccepted-root'] },
      },
      { dependencies, config: FIXTURE_CONFIG },
    );
    await expect(
      provider.establishAttestedSession(() => undefined),
    ).rejects.toMatchObject({
      providerId: 'temenos',
      stage: 'appraisal',
      checkId: 'snp-signature-chain',
    });
    expect(bind).not.toHaveBeenCalled();
  });
});

describe('resolved measurement configuration', () => {
  it('passes the full current ledger indexer URL to a fresh ledger client on each run', async () => {
    const dependencies = createMockDependencies({ latencyMs: 0 });
    const ledgerFactory = vi
      .spyOn(RealLedgerClient, 'fromConfig')
      .mockReturnValue(
        dependencies.ledgerClient as unknown as RealLedgerClient,
      );
    const getLedgerIndexerUrl = vi
      .fn()
      .mockResolvedValueOnce('https://indexer.example/graphql?apiKey=first')
      .mockResolvedValueOnce('https://indexer.example/graphql?apiKey=second');
    const { ledgerClient: _, ...overrides } = dependencies;
    const provider = createStoreTemenosAttestedProver(
      {
        networkId: MidnightSDKNetworkIds.PreProd,
        proofServerApiUrl: TEMENOS_PROOF_SERVER_URL,
        trustRoots: { amdRootCertificates: FIXTURE_CONFIG.amdRootCertificates },
        getLedgerIndexerUrl,
      },
      { dependencies: overrides, config: FIXTURE_CONFIG },
    );
    try {
      for (const apiKey of ['first', 'second']) {
        const session = await provider.establishAttestedSession(
          () => undefined,
        );
        expect(ledgerFactory).toHaveBeenLastCalledWith(
          expect.objectContaining({
            indexerUrl: `https://indexer.example/graphql?apiKey=${apiKey}`,
          }),
          { fetchImpl: expect.any(Function) as typeof fetch },
        );
        await session.close();
      }
      expect(getLedgerIndexerUrl).toHaveBeenCalledTimes(2);
    } finally {
      ledgerFactory.mockRestore();
    }
  });

  it('preserves successful binary proof bodies and rejects upstream HTTP errors', async () => {
    const { dependencies, run } = createDriver();
    const session = await run();
    const channel = dependencies.channelBinder.channels[0];
    const prove = vi.spyOn(channel, 'prove');
    const body = new Uint8Array([0, 255, 128, 0]);
    prove.mockResolvedValueOnce({
      status: 200,
      headers: { 'content-type': 'application/octet-stream' },
      body,
    });
    await expect(session.prove(body)).resolves.toEqual(body);
    prove.mockResolvedValueOnce({
      status: 422,
      headers: { 'content-type': 'text/plain' },
      body,
    });
    await expect(session.prove(body)).rejects.toThrow(
      'Proof server returned 422 through the attested channel',
    );
    await session.close();
  });
});

it('aborts Temenos evidence requests instead of waiting for their network timeout', async () => {
  const signals: AbortSignal[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_input: unknown, init: RequestInit) => {
      const signal = init.signal!;
      signals.push(signal);
      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => {
            reject(
              signal.reason instanceof Error
                ? signal.reason
                : new Error('Proof cancelled'),
            );
          },
          { once: true },
        );
      });
    }),
  );
  try {
    const driver = createStoreTemenosAttestedProver({
      networkId: MidnightSDKNetworkIds.PreProd,
      proofServerApiUrl: TEMENOS_PROOF_SERVER_URL,
      getLedgerIndexerUrl: async () => FIXTURE_CONFIG.indexerUrl,
      trustRoots: { amdRootCertificates: FIXTURE_CONFIG.amdRootCertificates },
    });
    const abort = new AbortController();
    const result = driver.establishAttestedSession(() => {}, abort.signal);
    const rejected = expect(result).rejects.toThrow();
    await vi.waitFor(() => {
      expect(signals.length).toBeGreaterThan(0);
    });
    abort.abort(new Error('Proof cancelled'));
    await rejected;
    expect(signals.every(signal => signal.aborted)).toBe(true);
  } finally {
    vi.unstubAllGlobals();
  }
});
