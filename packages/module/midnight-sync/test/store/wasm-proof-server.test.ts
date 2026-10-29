import { wasmProofActivities } from '@lace-lib/vendor/wasm-proof-backend';
import { createWasmCircuitProvider } from '@lace-lib/vendor/wasm-proof-compute';
import { createWasmProofServerAccess } from '@lace-lib/vendor/wasm-proof-server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProofActivity } from '@lace-lib/vendor/wasm-proof-backend';
import type {
  KeyMaterialProvider,
  ProvingProvider,
} from '@midnight-ntwrk/zkir-v2';

const mocks = vi.hoisted(() => ({
  prove: vi.fn<(...args: unknown[]) => Promise<Uint8Array>>(),
  check: vi.fn<(...args: unknown[]) => Promise<(bigint | undefined)[]>>(),
}));
vi.mock('@midnight-ntwrk/zkir-v2', () => ({
  provingProvider: (keys: KeyMaterialProvider) => ({
    prove: async (preimage: Uint8Array, location: string, binding?: bigint) =>
      mocks.prove(
        preimage,
        await keys.lookupKey(location),
        binding,
        await keys.getParams(10),
      ),
    check: async (preimage: Uint8Array, location: string) =>
      mocks.check(preimage, await keys.lookupKey(location)),
  }),
}));

describe('WASM proof backend', () => {
  const builtIn = {
    proverKey: new Uint8Array([1]),
    verifierKey: new Uint8Array([2]),
    ir: new Uint8Array([3]),
  };
  const contract = {
    proverKey: new Uint8Array([4]),
    verifierKey: new Uint8Array([5]),
    ir: new Uint8Array([6]),
  };
  const params = new Uint8Array([7]);
  const preimage = new Uint8Array([8]);
  const keys: KeyMaterialProvider = {
    lookupKey: vi.fn(async (location: string) =>
      location.startsWith('midnight/') ? builtIn : undefined,
    ),
    getParams: vi.fn(async () => params),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prove.mockResolvedValue(new Uint8Array([9]));
    mocks.check.mockResolvedValue([42n, undefined]);
  });

  it('refuses local proving when the application has not installed its worker backend', () => {
    expect(() => createWasmProofServerAccess()).toThrow('not configured');
  });

  it('keeps one WASM activity from transfer acceptance through proof completion', async () => {
    let latest: ProofActivity[] = [];
    const unsubscribe = wasmProofActivities.subscribe(value => {
      latest = value;
    });
    for (const activity of latest) wasmProofActivities.dismiss(activity.id);
    const access = createWasmProofServerAccess(createWasmCircuitProvider(keys));
    const prepared = access.circuits.prepare!('prove');
    expect(latest).toEqual([
      expect.objectContaining({ status: 'receiving', kind: 'proof' }),
    ]);
    const id = latest[0].id;
    await prepared.provider.prove({
      serializedPreimage: preimage,
      keyLocation: 'contract',
    });
    expect(latest).toEqual([
      expect.objectContaining({ id, status: 'succeeded' }),
    ]);
    prepared.fail();
    expect(latest[0].status).toBe('succeeded');
    const abandoned = access.circuits.prepare!('check');
    abandoned.fail();
    expect(latest[1].status).toBe('failed');
    unsubscribe();
  });

  it('groups parallel transaction circuits into one activity', async () => {
    let latest: ProofActivity[] = [];
    const unsubscribe = wasmProofActivities.subscribe(value => {
      latest = value;
    });
    for (const activity of latest) wasmProofActivities.dismiss(activity.id);
    const access = createWasmProofServerAccess(createWasmCircuitProvider(keys));
    await access.provingService.prove({
      prove: async (provider: ProvingProvider) => {
        await Promise.all([
          provider.prove(preimage, 'midnight/zswap/output', 3n),
          provider.prove(preimage, 'midnight/zswap/spend', 3n),
        ]);
        return new Uint8Array([9]);
      },
    } as never);
    expect(latest).toEqual([
      expect.objectContaining({ kind: 'transaction', status: 'succeeded' }),
    ]);
    unsubscribe();
  });

  it('keeps a failed transaction group active while a sibling circuit is still working', async () => {
    let latest: ProofActivity[] = [];
    const unsubscribe = wasmProofActivities.subscribe(value => {
      latest = value;
    });
    for (const activity of latest) wasmProofActivities.dismiss(activity.id);
    let complete!: (value: Uint8Array) => void;
    let failed!: () => void;
    const failing = new Promise<Uint8Array>((_resolve, reject) => {
      failed = () => {
        reject(new Error('worker failed'));
      };
    });
    const sibling = new Promise<Uint8Array>(resolve => {
      complete = resolve;
    });
    mocks.prove
      .mockImplementationOnce(async () => failing)
      .mockImplementationOnce(async () => sibling);
    const access = createWasmProofServerAccess(createWasmCircuitProvider(keys));
    const result = access.provingService.prove({
      prove: async (provider: ProvingProvider) => {
        await Promise.all([
          provider.prove(preimage, 'midnight/zswap/output', 3n),
          provider.prove(preimage, 'midnight/zswap/spend', 3n),
        ]);
        return new Uint8Array([9]);
      },
    } as never);
    const rejected = expect(result).rejects.toThrow(
      'Failed to prove transaction',
    );
    await vi.waitFor(() => {
      expect(mocks.prove).toHaveBeenCalledTimes(2);
    });
    failed();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(latest[0]?.status).toBe('preparing');
    complete(new Uint8Array([9]));
    await rejected;
    expect(latest).toEqual([
      expect.objectContaining({ kind: 'transaction', status: 'failed' }),
    ]);
    unsubscribe();
  });

  it('uses the SDK transaction adapter with built-in circuit keys', async () => {
    const access = createWasmProofServerAccess(createWasmCircuitProvider(keys));
    const transaction = {
      prove: vi.fn(async (provider: ProvingProvider) =>
        provider.prove(preimage, 'midnight/zswap/output', 3n),
      ),
    };
    await expect(
      access.provingService.prove(transaction as never),
    ).resolves.toEqual(new Uint8Array([9]));
    expect(keys.lookupKey).toHaveBeenCalledWith('midnight/zswap/output');
    expect(mocks.prove).toHaveBeenCalledWith(preimage, builtIn, 3n, params);
  });

  it.each([
    'Proof worker failed: memory access out of bounds',
    'Failed to fetch',
  ])('includes the original transaction proof failure: %s', async message => {
    mocks.prove.mockRejectedValueOnce(new Error(message));
    const access = createWasmProofServerAccess(createWasmCircuitProvider(keys));
    await expect(
      access.provingService.prove({
        prove: async (provider: ProvingProvider) =>
          provider.prove(preimage, 'midnight/zswap/output'),
      } as never),
    ).rejects.toThrow(`Failed to prove transaction: ${message}`);
  });

  it('omits endpoint credentials from the rendered proof failure', async () => {
    mocks.prove.mockRejectedValueOnce(
      new Error(
        'Download failed at https://example.invalid/params?token=private',
      ),
    );
    const access = createWasmProofServerAccess(createWasmCircuitProvider(keys));
    await expect(
      access.provingService.prove({
        prove: async (provider: ProvingProvider) =>
          provider.prove(preimage, 'midnight/zswap/output'),
      } as never),
    ).rejects.toThrow('Failed to prove transaction: Download failed at [URL]');
  });

  it('uses dApp material only for that call and forwards the binding input', async () => {
    const access = createWasmProofServerAccess(createWasmCircuitProvider(keys));
    await access.circuits.prove({
      serializedPreimage: preimage,
      keyLocation: 'contract',
      keyMaterial: contract,
      overwriteBindingInput: 4n,
    });
    expect(mocks.prove).toHaveBeenLastCalledWith(
      preimage,
      contract,
      4n,
      params,
    );
    expect(keys.lookupKey).toHaveBeenCalledWith('contract');
    await access.circuits.prove({
      serializedPreimage: preimage,
      keyLocation: 'contract',
    });
    expect(mocks.prove).toHaveBeenLastCalledWith(
      preimage,
      undefined,
      undefined,
      params,
    );
  });

  it('returns check ordinals directly without encoding a server response', async () => {
    await expect(
      createWasmProofServerAccess(
        createWasmCircuitProvider(keys),
      ).circuits.check({
        serializedPreimage: preimage,
        keyLocation: 'contract',
        keyMaterial: contract,
      }),
    ).resolves.toEqual([42n, undefined]);
    expect(mocks.check).toHaveBeenCalledWith(preimage, contract);
  });

  it('propagates proving and key-download failures without a server fallback', async () => {
    const request = { serializedPreimage: preimage, keyLocation: 'contract' };
    mocks.prove.mockRejectedValueOnce(new Error('out of memory'));
    await expect(
      createWasmProofServerAccess(
        createWasmCircuitProvider(keys),
      ).circuits.prove(request),
    ).rejects.toThrow('out of memory');
    const failingKeys = {
      ...keys,
      getParams: vi.fn(async () => {
        throw new Error('key download failed');
      }),
    };
    await expect(
      createWasmProofServerAccess(
        createWasmCircuitProvider(failingKeys),
      ).circuits.prove(request),
    ).rejects.toThrow('key download failed');
  });
});

it('reports check and proof as steps of one WASM activity and stops on a failed check', async () => {
  let state: ProofActivity[] = [];
  const unsubscribe = wasmProofActivities.subscribe(value => {
    state = value;
  });
  for (const activity of state) wasmProofActivities.dismiss(activity.id);
  const check = vi.fn(async () => {
    expect(state[0].steps?.map(step => step.status)).toEqual([
      'done',
      'running',
      'pending',
    ]);
    return [];
  });
  const prove = vi.fn(async () => {
    expect(state[0].steps?.map(step => step.status)).toEqual([
      'done',
      'done',
      'running',
    ]);
    return new Uint8Array([9]);
  });
  const circuits = createWasmProofServerAccess({ check, prove }).circuits;
  const prepared = circuits.prepare!('checkAndProve');
  const id = state[0].id;
  const request = {
    serializedPreimage: new Uint8Array([1]),
    keyLocation: 'test',
  };
  expect(await prepared.provider.checkAndProve!(request)).toEqual(
    new Uint8Array([9]),
  );
  expect(state).toHaveLength(1);
  expect(state[0]).toMatchObject({ id, kind: 'proof', status: 'succeeded' });
  expect(state[0].steps?.every(step => step.status === 'done')).toBe(true);
  wasmProofActivities.dismiss(id);
  check.mockRejectedValueOnce(new Error('Invalid witness'));
  await expect(circuits.checkAndProve!(request)).rejects.toThrow(
    'Invalid witness',
  );
  expect(prove).toHaveBeenCalledTimes(1);
  expect(state[0].steps?.map(step => step.status)).toEqual([
    'done',
    'failed',
    'pending',
  ]);
  unsubscribe();
});
