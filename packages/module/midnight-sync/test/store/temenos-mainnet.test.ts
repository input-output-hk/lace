import { AkxEvidenceProvider } from '@input-output-hk/temenos-attestation-verifier';
import {
  createMockDependencies,
  FIXTURE_CONFIG,
} from '@input-output-hk/temenos-attestation-verifier/mocks';
import {
  MidnightSDKNetworkIds,
  TEMENOS_PROOF_SERVER_MODES,
} from '@lace-contract/midnight-context';
import { describe, expect, it, vi } from 'vitest';

import { createStoreTemenosAttestedProver } from '../../src/store/temenos-attested-prover';

const PREPROD_URL = 'https://api.proofserver.wastedp.io';

describe('Temenos deployments', () => {
  it.each([
    {
      networkId: MidnightSDKNetworkIds.MainNet,
      proofServerApiUrl: 'https://api.proofserver.mainnet.wastedp.io',
      attestationHost: 'attestation.proofserver.mainnet.wastedp.io',
      akxServerUrl:
        'https://attestation.proofserver.mainnet.wastedp.io/tee_attestation',
      applicationId:
        '70402462424c122c65e2d3d2312757face3974940c9ac5d09249b61028350427',
    },
    {
      networkId: MidnightSDKNetworkIds.PreProd,
      proofServerApiUrl: PREPROD_URL,
      attestationHost: 'attestation.proofserver.wastedp.io',
      akxServerUrl:
        'https://attestation.proofserver.wastedp.io/tee_attestation',
      applicationId:
        'afe48970b7083e1b2855acce95a488e93a7c257a34f6275e77ac26f79ac7ad05',
    },
    {
      networkId: MidnightSDKNetworkIds.Preview,
      proofServerApiUrl: 'https://api.proofserver.preview.wastedp.io',
      attestationHost: 'attestation.proofserver.preview.wastedp.io',
      akxServerUrl:
        'https://attestation.proofserver.preview.wastedp.io/tee_attestation',
      applicationId:
        'b294b8879607f7d0f5cca3808a4b64aab7992de2a73d1e55dbafb091efca25f2',
    },
  ])(
    'uses the $networkId deployment and the shared preprod ledger',
    async config => {
      const dependencies = createMockDependencies({ latencyMs: 0 });
      dependencies.ledgerClient.simulateRevoked = true;
      const factory = vi
        .spyOn(AkxEvidenceProvider, 'fromConfig')
        .mockReturnValue(
          dependencies.evidenceProvider as unknown as AkxEvidenceProvider,
        );
      const { evidenceProvider: _, ...overrides } = dependencies;
      const options = {
        networkId: config.networkId,
        proofServerApiUrl: TEMENOS_PROOF_SERVER_MODES[config.networkId]!.url,
        trustRoots: { amdRootCertificates: FIXTURE_CONFIG.amdRootCertificates },
        getLedgerIndexerUrl: async () =>
          'https://ledger.example/preprod?apiKey=test',
      };
      const provider = createStoreTemenosAttestedProver(options, {
        dependencies: overrides,
      });
      try {
        await expect(
          provider.establishAttestedSession(() => undefined),
        ).rejects.toMatchObject({ phase: 'fetch-expected-values' });
        expect(factory).toHaveBeenCalledWith(
          expect.objectContaining({
            proofServerApiUrl: config.proofServerApiUrl,
            attestationHost: config.attestationHost,
            akxServerUrl: config.akxServerUrl,
            applicationId: config.applicationId,
            pointerContractAddress:
              'a58974f1cacda177edfea3bdc76c1cd48d5e3107b9a543b9d65cee6b454c9122',
          }),
          { fetchImpl: expect.any(Function) as typeof fetch },
        );
        expect(factory.mock.calls[0][0]).toHaveProperty(
          'indexerUrl',
          expect.stringContaining('preprod'),
        );
      } finally {
        factory.mockRestore();
      }
    },
  );

  it.each([MidnightSDKNetworkIds.MainNet, MidnightSDKNetworkIds.Preview])(
    'rejects the old preprod URL for %s',
    networkId => {
      const options = {
        networkId,
        proofServerApiUrl: PREPROD_URL,
        trustRoots: { amdRootCertificates: FIXTURE_CONFIG.amdRootCertificates },
        getLedgerIndexerUrl: async () =>
          'https://ledger.example/preprod?apiKey=test',
      };
      expect(() => createStoreTemenosAttestedProver(options)).toThrow(
        /no baked temenos attestation config/i,
      );
    },
  );
});
