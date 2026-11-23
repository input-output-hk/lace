import { createWasmCircuitProvider } from '@lace-lib/vendor/wasm-proof-compute';
import { describe, expect, it, vi } from 'vitest';

import type { KeyMaterialProvider } from '@midnightntwrk/zkir-v2';

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
  ).resolve('@midnightntwrk/zkir-v2');
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

vi.mock('@midnightntwrk/zkir-v3', () => ({
  provingProvider: (keys: KeyMaterialProvider) => ({
    prove: async (_preimage: Uint8Array, location: string) => {
      const material = await keys.lookupKey(location);
      const params = await keys.getParams(10);
      return new Uint8Array([3, material!.proverKey[0], params[0]]);
    },
    check: async () => [3n],
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

describe('WASM contract circuit format routing', () => {
  const material = (format: string) => ({
    proverKey: new Uint8Array([42]),
    verifierKey: new Uint8Array([43]),
    ir: new TextEncoder().encode(`midnight:ir-source[${format}]:`),
  });
  const keys = (): KeyMaterialProvider => ({
    lookupKey: async () => undefined,
    getParams: async () => new Uint8Array([7]),
  });
  const request = (format: string) => ({
    keyLocation: 'mintAndReceive',
    serializedPreimage: new Uint8Array([1]),
    ledgerVersion: 'v9' as const,
    keyMaterial: material(format),
  });

  it.each(['v3-generic', 'v3'])(
    'checks and proves %s contracts with v3',
    async format => {
      const provider = createWasmCircuitProvider(keys());
      await expect(provider.check(request(format))).resolves.toEqual([3n]);
      await expect(provider.prove(request(format))).resolves.toEqual(
        new Uint8Array([3, 42, 7]),
      );
    },
  );

  it('keeps retained v2 contracts on v2 even on ledger v9', async () => {
    const provider = createWasmCircuitProvider(keys());
    await expect(provider.prove(request('v2-generic'))).resolves.toEqual(
      new Uint8Array([42, 7]),
    );
  });

  it('selects from resolved built-in material rather than a caller-supplied override', async () => {
    const provider = createWasmCircuitProvider();
    await expect(
      provider.prove({
        ...request('v3-generic'),
        keyLocation: 'midnight/dust/spend',
      }),
    ).resolves.toEqual(new Uint8Array([9, 9]));
  });
});
