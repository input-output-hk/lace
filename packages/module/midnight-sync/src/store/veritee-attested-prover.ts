import {
  AkxChannelBinder,
  AkxEvidenceProvider,
  AttestationVerificationError,
  AttestationVerifier,
  LocalCheckFailedError,
  RealLedgerClient,
  RealLocalVerifier,
  RealWardenClient,
} from '@input-output-hk/veritee-attestation-verifier';
import { createVeriteeAttestedProverWith } from '@lace-lib/vendor/veritee-attested-prover';

import type {
  VerifierConfig,
  VerifierDependencies,
} from '@input-output-hk/veritee-attestation-verifier';
import type { VeriteeTrustRoots } from '@lace-lib/vendor/veritee-attested-prover';

export { VeriteeAttestationError } from '@lace-lib/vendor/veritee-attested-prover';
export type {
  VeriteeAttestationPhaseId,
  VeriteeAttestationCheckId,
  VeriteeTrustRoots,
} from '@lace-lib/vendor/veritee-attested-prover';

/**
 * The extension's Veritee driver with the verifier library's real
 * dependencies; the public SDK supplies its verifier through the host.
 *
 * @param testSeam - internal: only tests pass it, to swap in the library's mock
 *   dependencies and fixture deployment. No public entry re-exports this function.
 */
export const createStoreVeriteeAttestedProver = (
  props: {
    networkId: string;
    proofServerApiUrl: string;
    trustRoots: VeriteeTrustRoots;
    getLedgerIndexerUrl: () => Promise<string>;
  },
  testSeam?: {
    dependencies?: Partial<VerifierDependencies>;
    config?: Omit<VerifierConfig, 'amdRootCertificates' | 'indexerUrl'>;
  },
) =>
  createVeriteeAttestedProverWith(
    {
      ...props,
      verifier: {
        LocalCheckFailedError,
        AttestationVerificationError,
        createVerifier: (config, signal) => {
          // Keep the verifier's request timeouts while cancelling all network
          // phases belonging to this operation, including the encrypted proxy.
          const fetchImpl: typeof fetch = async (input, init) =>
            globalThis.fetch(input, {
              ...init,
              signal: signal
                ? AbortSignal.any([
                    signal,
                    ...(init?.signal ? [init.signal] : []),
                  ])
                : init?.signal,
            });
          const overrides = testSeam?.dependencies;
          return new AttestationVerifier(
            {
              evidenceProvider:
                overrides?.evidenceProvider ??
                AkxEvidenceProvider.fromConfig(config, { fetchImpl }),
              ledgerClient:
                overrides?.ledgerClient ??
                RealLedgerClient.fromConfig(config, { fetchImpl }),
              localVerifier:
                overrides?.localVerifier ?? new RealLocalVerifier(),
              wardenClient:
                overrides?.wardenClient ??
                RealWardenClient.fromConfig(config, { fetchImpl }),
              channelBinder:
                overrides?.channelBinder ??
                AkxChannelBinder.fromConfig(config, { fetchImpl }),
            },
            config,
          );
        },
      },
    },
    testSeam,
  );
