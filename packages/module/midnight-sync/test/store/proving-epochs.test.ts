import { createVersionedProvingService } from '@lace-lib/vendor/proof-server-transport';
import * as v8 from '@midnight-ntwrk/ledger-v8';
import * as v9 from '@midnightntwrk/ledger-v9';
import { ProtocolVersion } from '@midnightntwrk/wallet-sdk-abstractions';
import { describe, expect, it, vi } from 'vitest';

import type { ProofCircuitRequest } from '@lace-lib/vendor/midnight-proof-servers';

describe('transaction proof epoch routing', () => {
  it.each([
    ['v8', ProtocolVersion.MinSupportedVersion, v8],
    ['v9', ProtocolVersion.V9NativeForkVersion, v9],
  ] as const)(
    'routes %s proofs with the generation used to build the transaction',
    async (generation, version, ledger) => {
      const requests: ProofCircuitRequest[] = [];
      const service = createVersionedProvingService({
        check: async request => {
          requests.push(request);
          return [];
        },
        prove: async request => {
          requests.push(request);
          return new Uint8Array();
        },
      });
      const raw = ledger.Transaction.fromParts('undeployed');
      const preimage = new Uint8Array([1, 2]);
      vi.spyOn(raw, 'prove').mockImplementation(
        async (provider: v8.ProvingProvider) => {
          await provider.check(preimage, 'midnight/zswap/output');
          await provider.prove(preimage, 'midnight/zswap/output');
          return { bind: vi.fn() } as never;
        },
      );
      await service.prove(raw, version);
      expect(requests).toHaveLength(2);
      expect(
        requests.every(request => request.ledgerVersion === generation),
      ).toBe(true);
    },
  );

  it('rejects a mismatched ledger instance before the proof transport is used', async () => {
    const circuits = { check: vi.fn(), prove: vi.fn() };
    const service = createVersionedProvingService(circuits);
    await expect(
      service.prove(
        v8.Transaction.fromParts('undeployed'),
        ProtocolVersion.V9NativeForkVersion,
      ),
    ).rejects.toThrow('does not match');
    expect(circuits.prove).not.toHaveBeenCalled();
  });
});
