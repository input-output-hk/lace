import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createAttestedProofServerAccess } from '@lace-lib/vendor/attested-proving-service';
import { createTemenosAttestedProverWith } from '@lace-lib/vendor/temenos-attested-prover';
import * as midnightSyncSdk from '@lace-module/midnight-sync/sdk';
import { describe, expect, it, vi } from 'vitest';

import * as sdk from '../src/midnight';
import { createTemenosAttestedProver } from '../src/midnight';

import type {
  AttestationProgressEvent,
  TemenosVerifier,
} from '../src/midnight';

// The private verifier library and its mock deployment drive this suite. The
// public SDK repository's root manifest declares no package from a private
// registry, so the suite skips there; wherever the root declares the library,
// a failed import stays a failure. The seam itself is public and type-checked
// against `TemenosVerifier`.
const VERIFIER_LIBRARY = '@input-output-hk/temenos-attestation-verifier';
const rootManifest = JSON.parse(
  fs.readFileSync(
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../package.json',
    ),
    'utf8',
  ),
) as Record<
  'dependencies' | 'devDependencies' | 'optionalDependencies',
  Record<string, string> | undefined
>;
const isVerifierDeclared =
  VERIFIER_LIBRARY in
  {
    ...rootManifest.dependencies,
    ...rootManifest.devDependencies,
    ...rootManifest.optionalDependencies,
  };
const resolveVerifier = async <T>(load: () => Promise<T>) => {
  try {
    return await load();
  } catch (error) {
    if (isVerifierDeclared) throw error;
    return undefined;
  }
};
const verifierLibrary = await resolveVerifier(
  async () => import('@input-output-hk/temenos-attestation-verifier'),
);
const verifierMocks = await resolveVerifier(
  async () => import('@input-output-hk/temenos-attestation-verifier/mocks'),
);
const library = () => {
  if (!verifierLibrary || !verifierMocks)
    throw new Error('The Temenos verifier library is not installed');
  return { ...verifierLibrary, ...verifierMocks };
};

const fixture = () => {
  const {
    AttestationVerificationError,
    AttestationVerifier,
    LocalCheckFailedError,
    createMockDependencies,
    FIXTURE_CONFIG,
  } = library();
  const dependencies = createMockDependencies({ latencyMs: 0 });
  const createVerifier = vi.fn<TemenosVerifier['createVerifier']>(
    config => new AttestationVerifier(dependencies, config),
  );
  const verifier = {
    createVerifier,
    LocalCheckFailedError,
    AttestationVerificationError,
  };
  const roots = [...FIXTURE_CONFIG.amdRootCertificates];
  const props = {
    networkId: 'preview',
    proofServerApiUrl: 'https://api.proofserver.preview.wastedp.io',
    trustRoots: { amdRootCertificates: roots },
    getLedgerIndexerUrl: async () => FIXTURE_CONFIG.indexerUrl,
    verifier,
  };
  // The library's mock fixtures attest a mock deployment, which only the
  // internal factory accepts.
  const provider = createTemenosAttestedProverWith(props, {
    config: FIXTURE_CONFIG,
  });
  const events: AttestationProgressEvent[] = [];
  const access = createAttestedProofServerAccess(provider, event =>
    events.push(event),
  );
  return {
    dependencies,
    createVerifier,
    roots,
    props,
    provider,
    events,
    access,
  };
};

describe.skipIf(!verifierLibrary || !verifierMocks)(
  'SDK Temenos verifier injection',
  () => {
    it('uses the pinned verifier for fresh operations, forwards progress and closes tunneled sessions', async () => {
      const context = fixture();
      const bind = vi.spyOn(context.dependencies.channelBinder, 'bind');
      const verify = vi.spyOn(context.dependencies.localVerifier, 'verify');
      const originalRoots = [...context.roots];
      context.roots.push('later-untrusted-root');
      const session = await context.provider.establishAttestedSession(event =>
        context.events.push(event),
      );
      const channel = context.dependencies.channelBinder.channels[0];
      const close = vi.spyOn(channel, 'close');
      await session.prove(new Uint8Array([1]));
      await session.close();
      await context.access.transport.prove(new Uint8Array([2]));
      expect(context.createVerifier).toHaveBeenCalledTimes(2);
      expect(verify).toHaveBeenCalledTimes(2);
      expect(verify.mock.calls.map(call => call[2])).toEqual([
        originalRoots,
        originalRoots,
      ]);
      expect(bind).toHaveBeenCalledTimes(2);
      expect(close).toHaveBeenCalledTimes(1);
      expect(
        context.dependencies.channelBinder.channels.map(
          item => item.proveCalls,
        ),
      ).toEqual([1, 1]);
      expect(context.events).toContainEqual({
        type: 'phase',
        phase: 'bind-channel',
        status: 'completed',
      });
      expect(context.events).toContainEqual(
        expect.objectContaining({ type: 'check' }),
      );
    });

    it.each([
      ['local', 'verify-locally', 'LocalCheckFailedError'],
      ['ledger', 'fetch-expected-values', 'AttestationVerificationError'],
      ['warden', 'warden-verify', 'AttestationVerificationError'],
      ['channel', 'bind-channel', 'AttestationVerificationError'],
    ] as const)(
      'retains real %s error classification and never sends a payload on failure',
      async (failure, phase, errorClass) => {
        const ErrorClass = library()[errorClass];
        const context = fixture();
        if (failure === 'local')
          context.dependencies.localVerifier.failCheck = 'snp-signature-chain';
        if (failure === 'ledger')
          context.dependencies.ledgerClient.simulateRevoked = true;
        if (failure === 'warden')
          context.dependencies.wardenClient.simulateRejection = true;
        if (failure === 'channel')
          context.dependencies.channelBinder.simulateBindingFailure = true;
        const error: unknown = await context.access.transport
          .prove(new Uint8Array([1]))
          .catch((cause: unknown) => cause);
        expect(error).toMatchObject({
          name: 'TemenosAttestationError',
          phase,
          ...(failure === 'local' ? { checkId: 'snp-signature-chain' } : {}),
        });
        expect(error).toBeInstanceOf(Error);
        if (!(error instanceof Error))
          throw new Error('Expected an attestation error');
        expect(error.cause).toBeInstanceOf(ErrorClass);
        expect(context.dependencies.channelBinder.channels).toHaveLength(0);
      },
    );

    it('validates the baked deployment and roots before calling the host factory', () => {
      const { props, createVerifier } = fixture();
      expect(() =>
        createTemenosAttestedProver({
          ...props,
          proofServerApiUrl: 'https://unknown.example',
        }),
      ).toThrow('No baked Temenos attestation config');
      expect(() =>
        createTemenosAttestedProver({
          ...props,
          trustRoots: { amdRootCertificates: [' '] },
        }),
      ).toThrow('requires explicit AMD trust roots');
      expect(createVerifier).not.toHaveBeenCalled();
    });

    it('ignores the former deployment override', () => {
      const { props, createVerifier } = fixture();
      // A caller passing the former override still gets the baked deployment
      // and its proof-server URL check.
      const withOverride = createTemenosAttestedProver as (
        ...args: unknown[]
      ) => unknown;
      expect(() =>
        withOverride(
          { ...props, proofServerApiUrl: 'https://unknown.example' },
          { config: library().FIXTURE_CONFIG },
        ),
      ).toThrow('No baked Temenos attestation config');
      expect(createVerifier).not.toHaveBeenCalled();
    });
  },
);

// The public surface needs no verifier library, so this holds in the public
// repository as well.
describe('SDK Temenos public surface', () => {
  it('exposes no deployment override from the public entries', () => {
    expect(createTemenosAttestedProver).toHaveLength(1);
    expect(sdk).not.toHaveProperty('createTemenosAttestedProverWith');
    expect(midnightSyncSdk).not.toHaveProperty(
      'createTemenosAttestedProverWith',
    );
  });
});
