import {
  MidnightAccountId,
  MidnightNetworkId,
  MidnightSDKNetworkIds,
  TEMENOS_PROOF_SERVER_MODES,
} from '@lace-contract/midnight-context';
import * as stubData from '@lace-contract/midnight-context/src/stub-data';
import { AccountId } from '@lace-contract/wallet-repo';
import { createAttestedProofServerAccess } from '@lace-lib/vendor/attested-proving-service';
import {
  createScopedProofServerAccess,
  createCircuitProviderFromTransport,
} from '@lace-lib/vendor/proof-server-transport';
import {
  BehaviorSubject,
  defer,
  EMPTY,
  firstValueFrom,
  NEVER,
  of,
  Subject,
  TimeoutError,
} from 'rxjs';
import { dummyLogger } from 'ts-log';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  balanceMidnightSealedTransaction,
  balanceMidnightUnsealedTransaction,
  makeMidnightIntent,
  makeMidnightTransfer,
} from '../src/midnight-connector-transactions';
import { createMidnightModule } from '../src/midnight-module';
import { getMidnightProvingProvider } from '../src/midnight-proving-provider';
import {
  DEFAULT_PROVE_TIMEOUT_MS,
  proveMidnightTx,
} from '../src/prove-midnight-tx';

import type { MidnightTxRecipe } from '../src/build-midnight-transfer';
import type { WalletWithMidnight } from '../src/midnight-wallet';
import type {
  AttestationProgressEvent,
  MidnightWallet,
  MidnightWalletsByAccountId,
  ProofServerMode,
  StartMidnightAccountWalletParams,
} from '@lace-contract/midnight-context';
import type { ModuleInitProps } from '@lace-contract/module';
import type { AttestedProverProvider } from '@lace-lib/vendor/attested-proving-service';
import type { WalletFacade } from '@midnightntwrk/wallet-sdk/facade';

const ledgerMocks = vi.hoisted(() => ({
  createCheckPayload: vi.fn(() => new Uint8Array([0xcc])),
  createProvingPayload: vi.fn(() => new Uint8Array([0xff])),
  parseCheckResult: vi.fn(() => [42n, undefined]),
}));
vi.mock('@midnight-ntwrk/ledger-v8', async importOriginal => ({
  ...(await importOriginal<object>()),
  ...ledgerMocks,
}));
// The connector helpers' decoding is covered by their own tests; here they only need to reach proving.
vi.mock(
  '@lace-lib/vendor/midnight-connector-transaction',
  async importOriginal => ({
    ...(await importOriginal<object>()),
    deserializeMidnightSealedTransaction: vi.fn(async () => ({})),
    deserializeMidnightUnsealedTransaction: vi.fn(async () => ({})),
    groupMidnightConnectorInputs: vi.fn(() => ({})),
    groupMidnightConnectorOutputs: vi.fn(() => []),
  }),
);

const networkId = MidnightSDKNetworkIds.Preview;
const accountId = MidnightAccountId(stubData.walletId, 0, networkId);
const account = {
  ...stubData.midnightAccount,
  accountId,
  blockchainNetworkId: MidnightNetworkId(networkId),
  blockchainSpecific: {
    ...stubData.midnightAccount.blockchainSpecific,
    networkId,
  },
};
const fixture = () => {
  const registry = new BehaviorSubject<MidnightWalletsByAccountId>({});
  const networks = new BehaviorSubject([MidnightNetworkId(networkId)]);
  const wallet: WalletWithMidnight = {
    stateObservables: {
      wallets: {
        selectAll$: new BehaviorSubject([
          { ...stubData.midnightWallet, accounts: [account] },
        ]),
      },
      network: { selectAllActiveNetworkIds$: networks },
    } as unknown as WalletWithMidnight['stateObservables'],
    _loadModules: (async () => [
      registry,
    ]) as unknown as WalletWithMidnight['_loadModules'],
  };
  const transport = {
    check: vi.fn(async () => new Uint8Array([1])),
    prove: vi.fn(async () => new Uint8Array([2])),
  };
  const engine = {
    proofCircuitProvider: createCircuitProviderFromTransport(transport),
  } as unknown as MidnightWallet;
  registry.next({ [accountId]: engine });
  return { wallet, registry, networks, transport, engine };
};
const keyMaterialProvider = () => ({
  getProverKey: vi.fn(async () => new Uint8Array([3])),
  getVerifierKey: vi.fn(async () => new Uint8Array([4])),
  getZKIR: vi.fn(async () => new Uint8Array([5])),
});
const provider = (
  overrides: Partial<AttestedProverProvider> = {},
): AttestedProverProvider => ({
  id: 'fixture',
  phases: ['evidence'],
  operations: ['prove'],
  establishAttestedSession: async emit => {
    emit({ type: 'phase', phase: 'evidence', status: 'completed' });
    return { prove: async payload => payload, close: async () => undefined };
  },
  ...overrides,
});
const recipe = {} as MidnightTxRecipe;
const phase: AttestationProgressEvent = {
  type: 'phase',
  phase: 'proving',
  status: 'started',
};
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('SDK attested routing', () => {
  const tee = TEMENOS_PROOF_SERVER_MODES[networkId]!;
  it('forwards the public provider through SDK store initialization into engine dependencies', async () => {
    const providerFailure = new Error('provider refused startup');
    const createAttestedProver = vi.fn(() => {
      throw providerFailure;
    });
    const module = createMidnightModule({
      password: new Uint8Array(),
      createAttestedProver,
      networks: { [networkId]: { proofServer: tee } },
    });
    const { default: init } = await module.store!.load();
    const loaded = await init(
      {
        runtime: { config: { defaultMidnightTestnetNetworkId: networkId } },
      } as ModuleInitProps,
      {
        logger: dummyLogger,
      },
    );
    const start = loaded.sideEffectDependencies!.startMidnightAccountWallet!;
    await expect(
      firstValueFrom(
        start({
          account,
          config: {
            indexerAddress: 'https://indexer.test',
            nodeAddress: 'https://node.test',
            proofServer: tee,
          },
          store: { get: () => EMPTY },
          keyManager: {},
        } as unknown as StartMidnightAccountWalletParams),
      ),
    ).rejects.toBe(providerFailure);
    expect(createAttestedProver).toHaveBeenCalledWith({
      networkId,
      proofServerApiUrl: tee.url,
      getLedgerIndexerUrl: expect.any(Function) as unknown,
    });
  });
  it('accepts an explicitly attested mode with a host provider', () => {
    expect(() =>
      createMidnightModule({
        password: new Uint8Array(),
        createAttestedProver: () => provider(),
        networks: { [networkId]: { proofServer: tee } },
      }),
    ).not.toThrow();
  });
  it.each([
    tee.url,
    `${tee.url}/`,
    'http://api.proofserver.wastedp.io./',
    'https://API.PROOFSERVER.WASTEDP.IO:443/proxy',
  ])('refuses recognized TEE HTTP routing even with an adapter: %s', url => {
    expect(() =>
      createMidnightModule({
        password: new Uint8Array(),
        proofServerUrl: url,
        createAttestedProver: () => provider(),
      }),
    ).toThrow('select tee-delegated');
  });
  it.each<ProofServerMode>([
    tee,
    { kind: 'in-process' },
    { kind: 'paired-device', url: 'https://device.test', pairingId: 'device' },
  ])('refuses unavailable mode $kind', mode => {
    expect(() =>
      createMidnightModule({
        password: new Uint8Array(),
        networks: { [networkId]: { proofServer: mode } },
      }),
    ).toThrow();
  });
});

describe('account-bound circuit proving', () => {
  it('uses connector payloads, all key material and binding input without exposing an endpoint', async () => {
    const { wallet, transport } = fixture();
    const keys = keyMaterialProvider();
    const result = await getMidnightProvingProvider(wallet, {
      keyMaterialProvider: keys,
    });
    const circuit = result.unwrap();
    expect(Object.keys(circuit).sort()).toEqual(['check', 'prove']);
    const preimage = new Uint8Array([9]);
    await expect(circuit.check(preimage, 'circuit')).resolves.toEqual([
      42n,
      undefined,
    ]);
    await expect(circuit.prove(preimage, 'circuit', 7n)).resolves.toEqual(
      new Uint8Array([2]),
    );
    expect(ledgerMocks.createCheckPayload).toHaveBeenCalledWith(
      preimage,
      new Uint8Array([5]),
    );
    expect(ledgerMocks.createProvingPayload).toHaveBeenCalledWith(
      preimage,
      7n,
      {
        proverKey: new Uint8Array([3]),
        verifierKey: new Uint8Array([4]),
        ir: new Uint8Array([5]),
      },
    );
    for (const lookup of Object.values(keys))
      expect(lookup).toHaveBeenCalledWith('circuit');
    expect(transport.check).toHaveBeenCalledWith(
      new Uint8Array([0xcc]),
      undefined,
    );
    expect(transport.prove).toHaveBeenCalledWith(
      new Uint8Array([0xff]),
      undefined,
    );
  });
  it('retains the connector built-in-circuit fallback after a failed key lookup', async () => {
    const { wallet } = fixture();
    const keys = keyMaterialProvider();
    keys.getVerifierKey.mockRejectedValue(new Error('built-in circuit'));
    const circuit = (
      await getMidnightProvingProvider(wallet, { keyMaterialProvider: keys })
    ).unwrap();
    const preimage = new Uint8Array([9]);
    await circuit.check(preimage, 'midnight/zswap/spend');
    await circuit.prove(preimage, 'midnight/dust/spend');
    expect(ledgerMocks.createCheckPayload).toHaveBeenCalledWith(
      preimage,
      undefined,
    );
    expect(ledgerMocks.createProvingPayload).toHaveBeenCalledWith(
      preimage,
      undefined,
      undefined,
    );
  });
  it('rejects with the key lookup error for a dApp circuit and never reaches the proof server', async () => {
    const { wallet, transport } = fixture();
    const keys = keyMaterialProvider();
    const lookupFailure = new Error('key server unavailable');
    keys.getProverKey.mockRejectedValue(lookupFailure);
    keys.getZKIR.mockRejectedValue(lookupFailure);
    const circuit = (
      await getMidnightProvingProvider(wallet, { keyMaterialProvider: keys })
    ).unwrap();
    await expect(circuit.prove(new Uint8Array([9]), 'circuit')).rejects.toBe(
      lookupFailure,
    );
    await expect(circuit.check(new Uint8Array([9]), 'circuit')).rejects.toBe(
      lookupFailure,
    );
    expect(transport.prove).not.toHaveBeenCalled();
    expect(transport.check).not.toHaveBeenCalled();
  });
  it('returns Err for a missing account and rejects after stop or a network switch', async () => {
    const { wallet, registry, networks, transport } = fixture();
    expect(
      (
        await getMidnightProvingProvider(wallet, {
          accountId: AccountId('missing'),
          keyMaterialProvider: keyMaterialProvider(),
        })
      ).isErr(),
    ).toBe(true);
    const circuit = (
      await getMidnightProvingProvider(wallet, {
        startTimeout: 1,
        keyMaterialProvider: keyMaterialProvider(),
      })
    ).unwrap();
    registry.next({});
    await expect(circuit.prove(new Uint8Array(), 'c')).rejects.toMatchObject({
      name: 'MidnightWalletNotReadyError',
    });
    networks.next([]);
    await expect(circuit.check(new Uint8Array(), 'c')).rejects.toMatchObject({
      name: 'MidnightAccountNotFoundError',
    });
    expect(transport.prove).not.toHaveBeenCalled();
    expect(transport.check).not.toHaveBeenCalled();
  });
  it('resolves the captured account in its own current registry on every invocation', async () => {
    const first = fixture();
    const second = fixture();
    const circuit = (
      await getMidnightProvingProvider(first.wallet, {
        keyMaterialProvider: keyMaterialProvider(),
      })
    ).unwrap();
    const replacement = {
      proofCircuitProvider: createCircuitProviderFromTransport({
        ...first.transport,
        prove: vi.fn(async () => new Uint8Array([7])),
      }),
    } as unknown as MidnightWallet;
    first.registry.next({ [accountId]: replacement });
    await expect(circuit.prove(new Uint8Array(), 'c')).resolves.toEqual(
      new Uint8Array([7]),
    );
    expect(first.transport.prove).not.toHaveBeenCalled();
    expect(second.transport.prove).not.toHaveBeenCalled();
  });
  it('refuses unsupported checks, propagates attestation failure and closes settled sessions after stop', async () => {
    const { wallet, engine, registry } = fixture();
    let finish!: (value: Uint8Array) => void;
    const close = vi.fn(async () => undefined);
    const establish = vi.fn(async () => ({
      prove: async () =>
        new Promise<Uint8Array>(resolve => {
          finish = resolve;
        }),
      close,
    }));
    engine.proofCircuitProvider = createAttestedProofServerAccess(
      provider({ establishAttestedSession: establish }),
      () => undefined,
    ).circuits;
    const circuit = (
      await getMidnightProvingProvider(wallet, {
        keyMaterialProvider: keyMaterialProvider(),
      })
    ).unwrap();
    await expect(circuit.check(new Uint8Array(), 'c')).rejects.toMatchObject({
      name: 'ProofOperationUnavailableError',
    });
    expect(establish).not.toHaveBeenCalled();
    establish.mockRejectedValueOnce(new Error('attestation rejected'));
    await expect(circuit.prove(new Uint8Array(), 'c')).rejects.toThrow(
      'attestation rejected',
    );
    const inFlight = circuit.prove(new Uint8Array(), 'c');
    await vi.waitFor(() => {
      expect(finish).toBeTypeOf('function');
    });
    registry.next({});
    finish(new Uint8Array([8]));
    await expect(inFlight).resolves.toEqual(new Uint8Array([8]));
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe('operation-scoped proving progress', () => {
  it.each(['complete', 'failure', 'timeout'] as const)(
    'detaches the observer after %s',
    async outcome => {
      const { wallet, engine } = fixture();
      const operation = new Subject<never>();
      let emit!: (event: AttestationProgressEvent) => void;
      engine.finalizeRecipe = (_recipe, callback) => {
        emit = callback!;
        return operation;
      };
      const onProgress = vi.fn();
      const pending = proveMidnightTx(wallet, {
        recipe,
        onProgress,
        proveTimeout: 20,
      });
      await vi.waitFor(
        () => {
          expect(emit).toBeTypeOf('function');
        },
        { interval: 1 },
      );
      emit(phase);
      if (outcome === 'complete') operation.next({} as never);
      if (outcome === 'failure') operation.error(new Error('proof failed'));
      const result = await pending;
      expect(result.isOk()).toBe(outcome === 'complete');
      expect(operation.observed).toBe(false);
      emit(phase);
      expect(onProgress).toHaveBeenCalledTimes(1);
    },
  );
  it('routes real attestation phases independently for simultaneous recipes', async () => {
    const { wallet, engine } = fixture();
    const access = createScopedProofServerAccess(emit =>
      createAttestedProofServerAccess(provider(), emit),
    );
    const facade = {
      finalizeRecipe: async (value: { transaction: object }) =>
        access.provingService.prove(value.transaction as never),
    } as unknown as WalletFacade;
    engine.finalizeRecipe = (value, emit) =>
      defer(async () => access.finalizeRecipe(facade, value, emit));
    let finish!: () => void;
    const firstRecipe = {
      type: 'UNPROVEN_TRANSACTION',
      transaction: {
        prove: async () =>
          new Promise<void>(resolve => {
            finish = resolve;
          }),
      },
    } as unknown as MidnightTxRecipe;
    const secondRecipe = {
      type: 'UNPROVEN_TRANSACTION',
      transaction: { prove: async () => ({}) },
    } as unknown as MidnightTxRecipe;
    const firstEvents: AttestationProgressEvent[] = [];
    const secondEvents: AttestationProgressEvent[] = [];
    const pending = proveMidnightTx(wallet, {
      recipe: firstRecipe,
      onProgress: event => firstEvents.push(event),
    });
    await vi.waitFor(() => {
      expect(finish).toBeTypeOf('function');
    });
    const before = [...firstEvents];
    expect(
      (
        await proveMidnightTx(wallet, {
          recipe: secondRecipe,
          onProgress: event => secondEvents.push(event),
        })
      ).isOk(),
    ).toBe(true);
    expect(firstEvents).toEqual(before);
    expect(secondEvents.at(-1)).toEqual({
      type: 'phase',
      phase: 'transaction-finalizing',
      status: 'started',
    });
    finish();
    expect((await pending).isOk()).toBe(true);
    expect(firstEvents).toEqual(secondEvents);
  });
});

describe('proving timeouts', () => {
  // Every engine step before proving completes at once; proving never does.
  const stalledProving = () => {
    const context = fixture();
    const transport = {
      check: vi.fn(async () => new Promise<Uint8Array>(() => undefined)),
      prove: vi.fn(async () => new Promise<Uint8Array>(() => undefined)),
    };
    Object.assign(context.engine, {
      networkId,
      proofCircuitProvider: createCircuitProviderFromTransport(transport),
      balanceFinalizedTransaction: vi.fn(() => of(recipe)),
      balanceUnboundTransaction: vi.fn(() => of(recipe)),
      transferTransaction: vi.fn(() => of(recipe)),
      balanceUnprovenTransaction: vi.fn(() => of(recipe)),
      revert: vi.fn(() => of(undefined)),
      initSwap: vi.fn(() => of(recipe)),
      signRecipe: vi.fn(() => of(recipe)),
      finalizeRecipe: vi.fn(() => NEVER),
    });
    return { ...context, transport };
  };
  const circuit = async (wallet: WalletWithMidnight, proveTimeout?: number) =>
    (
      await getMidnightProvingProvider(wallet, {
        keyMaterialProvider: keyMaterialProvider(),
        proveTimeout,
      })
    ).unwrap();
  const settle = async <T>(operation: Promise<T>) =>
    operation.then(
      value => ({ value }),
      (error: unknown) => ({ value: undefined, error }),
    );
  const helpers: [
    string,
    (wallet: WalletWithMidnight, proveTimeout?: number) => Promise<unknown>,
  ][] = [
    [
      'proveMidnightTx',
      async (wallet, proveTimeout) =>
        proveMidnightTx(wallet, { recipe, proveTimeout }),
    ],
    [
      'balanceMidnightSealedTransaction',
      async (wallet, proveTimeout) =>
        balanceMidnightSealedTransaction(wallet, { tx: '00', proveTimeout }),
    ],
    [
      'balanceMidnightUnsealedTransaction',
      async (wallet, proveTimeout) =>
        balanceMidnightUnsealedTransaction(wallet, { tx: '00', proveTimeout }),
    ],
    [
      'makeMidnightTransfer',
      async (wallet, proveTimeout) =>
        makeMidnightTransfer(wallet, { desiredOutputs: [], proveTimeout }),
    ],
    [
      'makeMidnightIntent',
      async (wallet, proveTimeout) =>
        makeMidnightIntent(wallet, {
          desiredInputs: [],
          desiredOutputs: [],
          options: { intentId: 'random', payFees: true },
          proveTimeout,
        }),
    ],
    [
      'getMidnightProvingProvider check',
      async (wallet, proveTimeout) =>
        (await circuit(wallet, proveTimeout)).check(new Uint8Array(), 'c'),
    ],
    [
      'getMidnightProvingProvider prove',
      async (wallet, proveTimeout) =>
        (await circuit(wallet, proveTimeout)).prove(new Uint8Array(), 'c'),
    ],
  ];
  const timedOut = (outcome: { value: unknown; error?: unknown }) =>
    outcome.error ??
    (outcome.value as { isErr?: () => boolean; error?: unknown }).error;

  it.each(helpers)(
    '%s stops waiting for a stalled proof server after proveTimeout',
    async (_name, call) => {
      const { wallet } = stalledProving();
      const outcome = await settle(call(wallet, 20));
      expect(timedOut(outcome)).toBeInstanceOf(TimeoutError);
    },
  );

  it.each(helpers)(
    '%s waits the proveMidnightTx default before giving up',
    async (_name, call) => {
      vi.useFakeTimers();
      const { wallet } = stalledProving();
      let outcome: { value: unknown; error?: unknown } | undefined;
      void settle(call(wallet)).then(settled => {
        outcome = settled;
      });
      await vi.advanceTimersByTimeAsync(DEFAULT_PROVE_TIMEOUT_MS - 1);
      expect(outcome).toBeUndefined();
      await vi.advanceTimersByTimeAsync(1);
      expect(outcome && timedOut(outcome)).toBeInstanceOf(TimeoutError);
    },
  );

  // Timers clamp a longer delay to 1 ms, so such a value would time out at once.
  it.each([2 ** 31, Number.POSITIVE_INFINITY, 0, -1, Number.NaN])(
    'every proving helper refuses proveTimeout %s as Err before proving',
    async proveTimeout => {
      const { wallet, engine, transport } = stalledProving();
      const results = await Promise.all([
        ...helpers
          .filter(([name]) => !name.startsWith('getMidnightProvingProvider'))
          .map(async ([, call]) => call(wallet, proveTimeout)),
        getMidnightProvingProvider(wallet, {
          keyMaterialProvider: keyMaterialProvider(),
          proveTimeout,
        }),
      ]);
      expect(results).toHaveLength(6);
      for (const result of results) {
        const error = (result as { isErr: () => boolean; error?: unknown })
          .error;
        expect((result as { isErr: () => boolean }).isErr()).toBe(true);
        expect(error).toBeInstanceOf(RangeError);
        expect(error).toHaveProperty(
          'message',
          expect.stringContaining('proveTimeout'),
        );
      }
      expect(engine.finalizeRecipe).not.toHaveBeenCalled();
      expect(engine.balanceFinalizedTransaction).not.toHaveBeenCalled();
      expect(transport.prove).not.toHaveBeenCalled();
    },
  );

  it.each(helpers)(
    '%s keeps waiting under the largest delay a timer honours',
    async (_name, call) => {
      vi.useFakeTimers();
      const { wallet } = stalledProving();
      let outcome: { value: unknown; error?: unknown } | undefined;
      void settle(call(wallet, 2 ** 31 - 1)).then(settled => {
        outcome = settled;
      });
      await vi.advanceTimersByTimeAsync(DEFAULT_PROVE_TIMEOUT_MS * 2);
      expect(outcome).toBeUndefined();
    },
  );
});
