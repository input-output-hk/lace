import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createHttpProofServerTransport,
  createCircuitProviderFromTransport,
  createProvingProviderFromTransport,
  createProvingServiceFromTransport,
} from '../../src/store/proof-server-transport';

import type {
  ProvingProvider,
  UnprovenTransaction,
} from '@midnight-ntwrk/ledger-v8';

const ledgerMocks = vi.hoisted(() => ({
  createCheckPayload: vi.fn(() => new Uint8Array([0xcc])),
  createProvingPayload: vi.fn(() => new Uint8Array([0xff])),
  parseCheckResult: vi.fn(() => [1n]),
}));
vi.mock('@midnight-ntwrk/ledger-v8', async importOriginal => ({
  ...(await importOriginal<object>()),
  ...ledgerMocks,
}));

describe('createHttpProofServerTransport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(['check', 'prove'] as const)(
    'posts %s under the configured base path with the binary payload',
    async endpoint => {
      const response = new Uint8Array([3, 4]);
      const fetchMock = vi.fn().mockResolvedValue(new Response(response));
      vi.stubGlobal('fetch', fetchMock);
      const transport = createHttpProofServerTransport(
        'https://proof.example.com/service/',
      );
      const payload = new Uint8Array([1, 2]);

      await expect(transport[endpoint](payload)).resolves.toEqual(response);
      expect(fetchMock).toHaveBeenCalledWith(
        new URL(`https://proof.example.com/service/${endpoint}`),
        {
          method: 'POST',
          signal: undefined,
          headers: { 'Content-Type': 'application/octet-stream' },
          body: payload,
        },
      );
    },
  );

  it('rejects a failed response without retrying through another route', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('Prover unavailable', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    const transport = createHttpProofServerTransport('http://localhost:6300');

    await expect(transport.prove(new Uint8Array([1]))).rejects.toThrow(
      'Proof server returned 503: Prover unavailable',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('createProvingServiceFromTransport', () => {
  it('shares a provider across concurrent first calls without sharing it across services', async () => {
    const transport = { check: vi.fn(), prove: vi.fn() };
    const service = createProvingServiceFromTransport(transport);
    const otherService = createProvingServiceFromTransport(transport);
    const providers: ProvingProvider[] = [];
    const result = {};
    let release!: () => void;
    const pending = new Promise<void>(resolve => {
      release = resolve;
    });
    const prove = vi.fn(async (provider: ProvingProvider) => {
      providers.push(provider);
      await pending;
      return result;
    });
    const transaction = { prove } as unknown as UnprovenTransaction;

    const proofs = [
      service.prove(transaction),
      service.prove(transaction),
      otherService.prove(transaction),
    ];
    try {
      await vi.waitFor(() => {
        expect(prove).toHaveBeenCalledTimes(3);
      });
      expect(providers[0]).toBe(providers[1]);
      expect(providers[2]).not.toBe(providers[0]);
    } finally {
      release();
      expect(await Promise.all(proofs)).toEqual([result, result, result]);
    }
  });

  it('propagates the SDK proving error and allows retry on the same service', async () => {
    const service = createProvingServiceFromTransport({
      check: vi.fn(),
      prove: vi.fn(),
    });
    const result = {};
    const prove = vi
      .fn()
      .mockRejectedValueOnce(new Error('proof unavailable'))
      .mockResolvedValueOnce(result);
    const transaction = { prove } as unknown as UnprovenTransaction;

    await expect(service.prove(transaction)).rejects.toThrow(
      'Failed to prove transaction',
    );
    await expect(service.prove(transaction)).resolves.toBe(result);
    expect(prove).toHaveBeenCalledTimes(2);
    expect(prove.mock.calls[1][0]).toBe(prove.mock.calls[0][0]);
  });
});

describe('createProvingProviderFromTransport', () => {
  const preimage = new Uint8Array([9]);
  const transport = () => ({
    check: vi.fn(async () => new Uint8Array([1])),
    prove: vi.fn(async () => new Uint8Array([2])),
  });
  const keys = () => ({
    getProverKey: vi.fn(async () => new Uint8Array([3])),
    getVerifierKey: vi.fn(async () => new Uint8Array([4])),
    getZKIR: vi.fn(async () => new Uint8Array([5])),
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('proves every circuit with the proof server material when no provider is given', async () => {
    const wire = transport();
    const provider = createProvingProviderFromTransport(wire);

    await expect(provider.prove(preimage, 'circuit', 7n)).resolves.toEqual(
      new Uint8Array([2]),
    );
    await expect(provider.check(preimage, 'circuit')).resolves.toEqual([1n]);
    expect(ledgerMocks.createProvingPayload).toHaveBeenCalledWith(
      preimage,
      7n,
      undefined,
    );
    expect(ledgerMocks.createCheckPayload).toHaveBeenCalledWith(
      preimage,
      undefined,
    );
    expect(wire.prove).toHaveBeenCalledTimes(1);
    expect(wire.check).toHaveBeenCalledTimes(1);
  });

  it('by default proves without key material when any lookup fails, as the dApp connector does', async () => {
    const wire = transport();
    const material = keys();
    material.getProverKey.mockRejectedValue(new Error('unknown circuit'));
    const provider = createProvingProviderFromTransport(wire, material);

    await provider.prove(preimage, 'circuit');
    await provider.check(preimage, 'circuit');

    expect(ledgerMocks.createProvingPayload).toHaveBeenCalledWith(
      preimage,
      undefined,
      undefined,
    );
    expect(ledgerMocks.createCheckPayload).toHaveBeenCalledWith(
      preimage,
      undefined,
    );
    expect(wire.prove).toHaveBeenCalledTimes(1);
    expect(wire.check).toHaveBeenCalledTimes(1);
  });

  it('when propagating, still falls back for a failed built-in circuit lookup', async () => {
    const wire = transport();
    const material = keys();
    material.getProverKey.mockRejectedValue(new Error('not a dApp circuit'));
    const provider = createProvingProviderFromTransport(wire, material, {
      onKeyMaterialError: 'propagate',
    });

    await provider.prove(preimage, 'midnight/zswap/spend');

    expect(material.getProverKey).toHaveBeenCalledWith('midnight/zswap/spend');
    expect(ledgerMocks.createProvingPayload).toHaveBeenCalledWith(
      preimage,
      undefined,
      undefined,
    );
    expect(wire.prove).toHaveBeenCalledTimes(1);
  });

  it.each(['prove', 'check'] as const)(
    'when propagating, rejects %s with the provider error for a dApp circuit without contacting the proof server',
    async method => {
      const wire = transport();
      const material = keys();
      const failure = new Error('key server unavailable');
      material.getZKIR.mockRejectedValue(failure);
      const provider = createProvingProviderFromTransport(wire, material, {
        onKeyMaterialError: 'propagate',
      });

      await expect(provider[method](preimage, 'circuit')).rejects.toBe(failure);
      expect(wire.prove).not.toHaveBeenCalled();
      expect(wire.check).not.toHaveBeenCalled();
    },
  );

  it('sends the resolved material for a dApp circuit', async () => {
    const wire = transport();
    const provider = createProvingProviderFromTransport(wire, keys());

    await provider.prove(preimage, 'circuit');

    expect(ledgerMocks.createProvingPayload).toHaveBeenCalledWith(
      preimage,
      undefined,
      {
        proverKey: new Uint8Array([3]),
        verifierKey: new Uint8Array([4]),
        ir: new Uint8Array([5]),
      },
    );
  });
});

describe('circuit request encoding for server modes', () => {
  it('passes the preimage, binding input and dApp keys to the SDK encoder', async () => {
    const ledger = await import('@midnight-ntwrk/ledger-v8');
    const request = {
      serializedPreimage: new Uint8Array([1]),
      keyLocation: 'contract',
      keyMaterial: {
        proverKey: new Uint8Array([2]),
        verifierKey: new Uint8Array([3]),
        ir: new Uint8Array([4]),
      },
      overwriteBindingInput: 7n,
    };
    const provePayload = new Uint8Array([8]);
    const checkPayload = new Uint8Array([9]);
    vi.spyOn(ledger, 'createProvingPayload').mockReturnValue(provePayload);
    vi.spyOn(ledger, 'createCheckPayload').mockReturnValue(checkPayload);
    vi.spyOn(ledger, 'parseCheckResult').mockReturnValue([42n, undefined]);
    const response = new Uint8Array([10]);
    const transport = {
      prove: vi.fn(async () => response),
      check: vi.fn(async () => response),
    };
    const circuits = createCircuitProviderFromTransport(transport);
    await expect(circuits.prove(request)).resolves.toBe(response);
    expect(ledger.createProvingPayload).toHaveBeenCalledWith(
      request.serializedPreimage,
      7n,
      request.keyMaterial,
    );
    expect(transport.prove).toHaveBeenCalledWith(provePayload, undefined);
    await expect(circuits.check(request)).resolves.toEqual([42n, undefined]);
    expect(ledger.createCheckPayload).toHaveBeenCalledWith(
      request.serializedPreimage,
      request.keyMaterial.ir,
    );
    expect(transport.check).toHaveBeenCalledWith(checkPayload, undefined);
    vi.restoreAllMocks();
  });
});

it.each(['check', 'prove'] as const)(
  'cancels the HTTP %s request at the circuit boundary',
  async method => {
    let requestSignal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: unknown, init: RequestInit) => {
        requestSignal = init.signal!;
        return new Promise<Response>((_resolve, reject) => {
          requestSignal!.addEventListener(
            'abort',
            () => {
              reject(
                requestSignal!.reason instanceof Error
                  ? requestSignal!.reason
                  : new Error('Proof cancelled'),
              );
            },
            { once: true },
          );
        });
      }),
    );
    try {
      const abort = new AbortController();
      const provider = createCircuitProviderFromTransport(
        createHttpProofServerTransport('http://localhost:6300'),
      );
      const result = provider[method](
        { serializedPreimage: new Uint8Array([1]), keyLocation: 'circuit' },
        abort.signal,
      );
      const rejected = expect(result).rejects.toThrow('Proof cancelled');
      abort.abort(new Error('Proof cancelled'));
      await rejected;
      expect(requestSignal?.aborted).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  },
);
