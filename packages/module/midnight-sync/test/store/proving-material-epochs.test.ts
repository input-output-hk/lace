import { createWasmCircuitProvider } from '@lace-lib/vendor/wasm-proof-compute';
import { describe, expect, it, vi } from 'vitest';

import type { KeyMaterialProvider } from '@midnight-ntwrk/zkir-v2';

const { v8Keys, v9Keys } = vi.hoisted(() => {
  const keys = (marker: number) => ({
    lookupKey: vi.fn(async () => ({
      proverKey: new Uint8Array([marker]),
      verifierKey: new Uint8Array([marker]),
      ir: new Uint8Array([marker]),
    })),
    getParams: vi.fn(async () => new Uint8Array([marker])),
  });
  return { v8Keys: keys(8), v9Keys: keys(9) };
});
vi.mock('@midnightntwrk/wallet-sdk/prover-client/effect', () => ({
  WasmProver: {
    makeV8KeyMaterialProvider: () => v8Keys,
    makeV9KeyMaterialProvider: () => v9Keys,
  },
}));
// Mock the vendor's pinned prover, which can differ from the root's legacy copy.
const vendorProver = await vi.hoisted(async () => {
  const { createRequire } = await import('node:module');
  return createRequire(
    new URL('../../../../lib/vendor/package.json', import.meta.url),
  ).resolve('@midnight-ntwrk/zkir-v2');
});
vi.mock(vendorProver, () => ({
  provingProvider: (keys: KeyMaterialProvider) => ({
    prove: async (_preimage: Uint8Array, location: string) => {
      const material = await keys.lookupKey(location);
      const params = await keys.getParams(10);
      return new Uint8Array([material!.proverKey[0], params[0]]);
    },
    check: async (_preimage: Uint8Array, location: string) => [
      BigInt((await keys.lookupKey(location))!.ir[0]),
    ],
  }),
}));

describe('WASM wallet circuit material by epoch', () => {
  it('keeps v8 and v9 material separate even when the circuit names match', async () => {
    const provider = createWasmCircuitProvider();
    const request = {
      keyLocation: 'midnight/zswap/output',
      serializedPreimage: new Uint8Array([1]),
    };
    await expect(
      provider.prove({ ...request, ledgerVersion: 'v8' }),
    ).resolves.toEqual(new Uint8Array([8, 8]));
    await expect(
      provider.prove({ ...request, ledgerVersion: 'v9' }),
    ).resolves.toEqual(new Uint8Array([9, 9]));
    await expect(
      provider.check({ ...request, ledgerVersion: 'v9' }),
    ).resolves.toEqual([9n]);
    await expect(provider.prove(request)).resolves.toEqual(
      new Uint8Array([8, 8]),
    );
    expect(v8Keys.lookupKey).toHaveBeenCalledTimes(2);
    expect(v9Keys.lookupKey).toHaveBeenCalledTimes(2);
  });
});
