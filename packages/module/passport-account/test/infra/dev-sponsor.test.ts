import { SponsorExhaustedError } from '@lace-contract/passport';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDevSponsor,
  createDevSponsorWalletContext,
} from '../../src/infra/dev-sponsor';

import type {
  DevSponsorConfig,
  SponsorWallet,
  SponsorWalletContext,
} from '../../src/infra/dev-sponsor';

const sdkMocks = vi.hoisted(() => {
  const roleKeys = {
    0: new Uint8Array([1, 0]),
    2: new Uint8Array([1, 2]),
    3: new Uint8Array([1, 3]),
  };
  const deriveKeysAt = vi.fn(() => ({
    type: 'keysDerived' as const,
    keys: roleKeys,
  }));
  const selectRoles = vi.fn(() => ({ deriveKeysAt }));
  const selectAccount = vi.fn(() => ({ selectRoles }));
  const clear = vi.fn();
  const fromSeed = vi.fn(() => ({
    type: 'seedOk' as const,
    hdWallet: { selectAccount, clear },
  }));

  const keystore = { signDataAsync: vi.fn(async () => 'segment-signature') };
  const createKeystore = vi.fn(() => keystore);
  const fromKeyStore = vi.fn(() => 'unshielded-public-key');
  const startWithPublicKey = vi.fn(() => 'unshielded-wallet');
  const UnshieldedWallet = vi.fn(() => ({ startWithPublicKey }));

  const startWithSecretKeys = vi.fn(() => 'shielded-wallet');
  const ShieldedWallet = vi.fn(() => ({ startWithSecretKeys }));

  const startWithSecretKey = vi.fn(() => 'dust-wallet');
  const DustWallet = vi.fn(() => ({ startWithSecretKey }));

  const facade = {
    start: vi.fn(async () => undefined),
    dust: { waitForSyncedState: vi.fn(async () => ({})) },
  };
  const init = vi.fn(async () => facade);

  const zswapFromSeed = vi.fn(() => 'zswap-secret-keys');
  const dustFromSeed = vi.fn(() => 'dust-secret-key');
  const initialParameters = vi.fn(() => ({ dust: 'dust-params' }));
  const deserialize = vi.fn(() => 'deserialized-tx');
  const getNetworkId = vi.fn(() => 'testnet-02');
  const setNetworkId = vi.fn();

  return {
    roleKeys,
    deriveKeysAt,
    selectRoles,
    selectAccount,
    clear,
    fromSeed,
    keystore,
    createKeystore,
    fromKeyStore,
    startWithPublicKey,
    UnshieldedWallet,
    startWithSecretKeys,
    ShieldedWallet,
    startWithSecretKey,
    DustWallet,
    facade,
    init,
    zswapFromSeed,
    dustFromSeed,
    initialParameters,
    deserialize,
    getNetworkId,
    setNetworkId,
  };
});

vi.mock('@midnightntwrk/wallet-sdk-hd', () => ({
  HDWallet: { fromSeed: sdkMocks.fromSeed },
  Roles: {
    NightExternal: 0,
    NightInternal: 1,
    Dust: 2,
    Zswap: 3,
    EcdsaUnshielded: 4,
  },
}));

vi.mock('@midnightntwrk/wallet-sdk-unshielded-wallet', () => ({
  createKeystore: sdkMocks.createKeystore,
  PublicKey: { fromKeyStore: sdkMocks.fromKeyStore },
  UnshieldedWallet: sdkMocks.UnshieldedWallet,
}));

vi.mock('@midnightntwrk/wallet-sdk-shielded', () => ({
  ShieldedWallet: sdkMocks.ShieldedWallet,
}));

vi.mock('@midnightntwrk/wallet-sdk-dust-wallet', () => ({
  DustWallet: sdkMocks.DustWallet,
}));

vi.mock('@midnightntwrk/wallet-sdk-facade', () => ({
  WalletFacade: { init: sdkMocks.init },
}));

vi.mock('@midnightntwrk/ledger-v9', () => ({
  ZswapSecretKeys: { fromSeed: sdkMocks.zswapFromSeed },
  DustSecretKey: { fromSeed: sdkMocks.dustFromSeed },
  LedgerParameters: { initialParameters: sdkMocks.initialParameters },
  Transaction: { deserialize: sdkMocks.deserialize },
}));

vi.mock('@midnight-ntwrk/midnight-js-network-id', () => ({
  getNetworkId: sdkMocks.getNetworkId,
  setNetworkId: sdkMocks.setNetworkId,
}));

const network = {
  seedHex: 'ab'.repeat(32),
  networkId: 'undeployed',
  indexerUrl: 'http://localhost:8088/api/v4/graphql',
  indexerWsUrl: 'ws://localhost:8088/api/v4/graphql/ws',
  nodeUrl: 'http://localhost:9944',
  proofServerUrl: 'http://localhost:6300',
};

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(pending => {
    resolve = pending;
  });
  return { promise, resolve };
};

const finalizedTx = (bytes: Uint8Array) => ({ serialize: () => bytes });

type WalletOverrides = Partial<Record<keyof SponsorWallet, unknown>>;

const walletContext = (overrides: WalletOverrides = {}) => {
  const secretKeys = { shieldedSecretKeys: 'zswap', dustSecretKey: 'dust' };
  const signSegment = vi.fn(async () => 'signature');
  const deserializeUnbalanced = vi.fn(
    (bytes: Uint8Array) => `tx-${bytes.join('.')}`,
  );
  const wallet = {
    estimateTransactionFee: vi.fn(async () => 1n),
    balanceUnboundTransaction: vi.fn(async () => 'recipe'),
    signRecipe: vi.fn(async () => 'signed-recipe'),
    finalizeRecipe: vi.fn(async () => finalizedTx(new Uint8Array([7]))),
    stop: vi.fn(async () => undefined),
    ...overrides,
  } as unknown as SponsorWallet;
  const context: SponsorWalletContext = {
    wallet,
    secretKeys,
    signSegment,
    deserializeUnbalanced,
  };
  return { context, wallet, secretKeys, signSegment, deserializeUnbalanced };
};

const sponsorConfig = (
  context: SponsorWalletContext,
  overrides: Partial<DevSponsorConfig> = {},
): {
  config: DevSponsorConfig;
  createWalletContext: ReturnType<typeof vi.fn>;
} => {
  const createWalletContext = vi.fn(async () => context);
  return {
    config: { ...network, createWalletContext, ...overrides },
    createWalletContext,
  };
};

/** A clock advanced only by the injected sleep, so tests control time. */
const virtualClock = () => {
  let time = 0;
  const now = () => new Date(time);
  const sleep = vi.fn(async (ms: number) => {
    time += ms;
  });
  return { now, sleep };
};

describe('createDevSponsor', () => {
  it('checks the fee budget, balances only dust, signs, finalizes, and returns the finalized bytes', async () => {
    const now = () => new Date(1_000_000);
    const { context, wallet, secretKeys, signSegment, deserializeUnbalanced } =
      walletContext();
    const { config } = sponsorConfig(context, { now });
    const sponsor = createDevSponsor(config);
    const unbalanced = new Uint8Array([1, 2]);

    const balanced = await sponsor.balanceAndSign(unbalanced);

    expect(balanced).toEqual(new Uint8Array([7]));
    expect(deserializeUnbalanced).toHaveBeenCalledWith(unbalanced);
    expect(wallet.estimateTransactionFee).toHaveBeenCalledWith(
      'tx-1.2',
      secretKeys.dustSecretKey,
      { ttl: new Date(1_000_000 + 60_000) },
    );
    expect(wallet.balanceUnboundTransaction).toHaveBeenCalledWith(
      'tx-1.2',
      secretKeys,
      { ttl: new Date(1_000_000 + 60_000), tokenKindsToBalance: ['dust'] },
    );
    expect(wallet.signRecipe).toHaveBeenCalledWith('recipe', signSegment);
    expect(wallet.finalizeRecipe).toHaveBeenCalledWith('signed-recipe');
  });

  it('honours a custom transaction ttl', async () => {
    const now = () => new Date(500);
    const { context, wallet } = walletContext();
    const { config } = sponsorConfig(context, { now, txTtlMs: 5000 });

    await createDevSponsor(config).balanceAndSign(new Uint8Array([1]));

    expect(wallet.balanceUnboundTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ ttl: new Date(5500) }),
    );
  });

  it('creates the wallet context once across calls', async () => {
    const { context } = walletContext();
    const { config, createWalletContext } = sponsorConfig(context);
    const sponsor = createDevSponsor(config);

    await sponsor.balanceAndSign(new Uint8Array([1]));
    await sponsor.balanceAndSign(new Uint8Array([2]));

    expect(createWalletContext).toHaveBeenCalledTimes(1);
  });

  it('serialises concurrent calls: the second only starts after the first finished', async () => {
    const firstFinalize = deferred<{ serialize: () => Uint8Array }>();
    const finalizeRecipe = vi
      .fn()
      .mockReturnValueOnce(firstFinalize.promise)
      .mockResolvedValueOnce(finalizedTx(new Uint8Array([2])));
    const { context, wallet } = walletContext({ finalizeRecipe });
    const { config } = sponsorConfig(context);
    const sponsor = createDevSponsor(config);

    const first = sponsor.balanceAndSign(new Uint8Array([1]));
    const second = sponsor.balanceAndSign(new Uint8Array([2]));
    await vi.waitFor(() => {
      expect(finalizeRecipe).toHaveBeenCalledTimes(1);
    });
    expect(wallet.balanceUnboundTransaction).toHaveBeenCalledTimes(1);

    firstFinalize.resolve(finalizedTx(new Uint8Array([1])));

    expect(await first).toEqual(new Uint8Array([1]));
    expect(await second).toEqual(new Uint8Array([2]));
    expect(wallet.balanceUnboundTransaction).toHaveBeenCalledTimes(2);
    expect(
      (
        wallet.balanceUnboundTransaction as ReturnType<typeof vi.fn>
      ).mock.calls.map(([tx]) => tx as string),
    ).toEqual(['tx-1', 'tx-2']);
  });

  it('keeps serving after a failed call', async () => {
    const balanceUnboundTransaction = vi
      .fn()
      .mockRejectedValueOnce(new Error('proof server down'))
      .mockResolvedValueOnce('recipe');
    const { context } = walletContext({ balanceUnboundTransaction });
    const { config } = sponsorConfig(context);
    const sponsor = createDevSponsor(config);

    await expect(sponsor.balanceAndSign(new Uint8Array([1]))).rejects.toThrow(
      'proof server down',
    );
    await expect(sponsor.balanceAndSign(new Uint8Array([2]))).resolves.toEqual(
      new Uint8Array([7]),
    );
  });

  it('retries while the fee estimate rejects transiently and balances once the budget covers the fee', async () => {
    const { now, sleep } = virtualClock();
    const estimateTransactionFee = vi
      .fn()
      .mockRejectedValueOnce(new Error('could not balance dust'))
      .mockRejectedValueOnce(new Error('DustWalletError: insufficient funds'))
      .mockResolvedValue(1n);
    const { context, wallet } = walletContext({ estimateTransactionFee });
    const { config } = sponsorConfig(context, { now, sleep });

    const balanced = await createDevSponsor(config).balanceAndSign(
      new Uint8Array([1]),
    );

    expect(balanced).toEqual(new Uint8Array([7]));
    expect(estimateTransactionFee).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([5000, 5000]);
    expect(wallet.balanceUnboundTransaction).toHaveBeenCalledTimes(1);
    expect(wallet.balanceUnboundTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ ttl: new Date(10_000 + 60_000) }),
    );
  });

  it('retries a transient balancing rejection after the estimate passed', async () => {
    const { now, sleep } = virtualClock();
    const balanceUnboundTransaction = vi
      .fn()
      .mockRejectedValueOnce(new Error('could not balance dust'))
      .mockResolvedValueOnce('recipe');
    const { context } = walletContext({ balanceUnboundTransaction });
    const { config } = sponsorConfig(context, { now, sleep });

    await expect(
      createDevSponsor(config).balanceAndSign(new Uint8Array([1])),
    ).resolves.toEqual(new Uint8Array([7]));
    expect(balanceUnboundTransaction).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('maps a transient rejection to SponsorExhaustedError only after the deadline, capping the final wait', async () => {
    const { now, sleep } = virtualClock();
    const estimateTransactionFee = vi
      .fn()
      .mockRejectedValue(new Error('could not balance dust'));
    const { context, wallet } = walletContext({ estimateTransactionFee });
    const { config } = sponsorConfig(context, {
      now,
      sleep,
      dustFeeTimeoutMs: 12_000,
    });

    await expect(
      createDevSponsor(config).balanceAndSign(new Uint8Array([1])),
    ).rejects.toThrow(SponsorExhaustedError);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([5000, 5000, 2000]);
    expect(estimateTransactionFee).toHaveBeenCalledTimes(4);
    expect(wallet.balanceUnboundTransaction).not.toHaveBeenCalled();
  });

  it.each(['Could not balance dust', 'DustWalletError: insufficient funds'])(
    'maps the exhausted balancing rejection "%s" to SponsorExhaustedError once the deadline passed',
    async message => {
      const balanceUnboundTransaction = vi.fn(async () => {
        throw new Error(message);
      });
      const { context } = walletContext({ balanceUnboundTransaction });
      const { config } = sponsorConfig(context, { dustFeeTimeoutMs: 0 });

      await expect(
        createDevSponsor(config).balanceAndSign(new Uint8Array([1])),
      ).rejects.toThrow(SponsorExhaustedError);
    },
  );

  it('maps a non-Error transient rejection by its string form', async () => {
    const balanceUnboundTransaction = vi
      .fn()
      .mockRejectedValue('could not balance dust');
    const { context } = walletContext({ balanceUnboundTransaction });
    const { config } = sponsorConfig(context, { dustFeeTimeoutMs: 0 });

    await expect(
      createDevSponsor(config).balanceAndSign(new Uint8Array([1])),
    ).rejects.toThrow(SponsorExhaustedError);
  });

  it('rethrows unrelated balancing failures unchanged without retrying', async () => {
    const { now, sleep } = virtualClock();
    const balanceUnboundTransaction = vi.fn(async () => {
      throw new Error('ttl expired');
    });
    const { context } = walletContext({ balanceUnboundTransaction });
    const { config } = sponsorConfig(context, { now, sleep });

    await expect(
      createDevSponsor(config).balanceAndSign(new Uint8Array([1])),
    ).rejects.toThrow('ttl expired');
    expect(sleep).not.toHaveBeenCalled();
  });

  it('stop is a no-op when the wallet was never started', async () => {
    const { context } = walletContext();
    const { config, createWalletContext } = sponsorConfig(context);

    await createDevSponsor(config).stop();

    expect(createWalletContext).not.toHaveBeenCalled();
  });

  it('stop waits for the in-flight sponsoring to finish before stopping the wallet', async () => {
    const firstFinalize = deferred<{ serialize: () => Uint8Array }>();
    const finalizeRecipe = vi.fn().mockReturnValueOnce(firstFinalize.promise);
    const { context, wallet } = walletContext({ finalizeRecipe });
    const { config } = sponsorConfig(context);
    const sponsor = createDevSponsor(config);

    const inFlight = sponsor.balanceAndSign(new Uint8Array([1]));
    const stopped = sponsor.stop();
    await vi.waitFor(() => {
      expect(finalizeRecipe).toHaveBeenCalledTimes(1);
    });
    expect(wallet.stop).not.toHaveBeenCalled();

    firstFinalize.resolve(finalizedTx(new Uint8Array([1])));

    await inFlight;
    await stopped;
    expect(wallet.stop).toHaveBeenCalledTimes(1);
  });
});

describe('createDevSponsorWalletContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sdkMocks.fromSeed.mockReturnValue({
      type: 'seedOk' as const,
      hdWallet: {
        selectAccount: sdkMocks.selectAccount,
        clear: sdkMocks.clear,
      },
    });
    sdkMocks.deriveKeysAt.mockReturnValue({
      type: 'keysDerived' as const,
      keys: sdkMocks.roleKeys,
    });
  });

  it('applies the configured network id before reading it back for the wallet slots', async () => {
    await createDevSponsorWalletContext(network);

    expect(sdkMocks.setNetworkId).toHaveBeenCalledExactlyOnceWith(
      network.networkId,
    );
    expect(sdkMocks.setNetworkId.mock.invocationCallOrder[0]).toBeLessThan(
      sdkMocks.getNetworkId.mock.invocationCallOrder[0],
    );
  });

  it('derives the role keys exactly like the reference wallet', async () => {
    await createDevSponsorWalletContext(network);

    expect(sdkMocks.fromSeed).toHaveBeenCalledWith(
      new Uint8Array(new Array(32).fill(0xab)),
    );
    expect(sdkMocks.selectAccount).toHaveBeenCalledWith(0);
    expect(sdkMocks.selectRoles).toHaveBeenCalledWith([3, 0, 2]);
    expect(sdkMocks.deriveKeysAt).toHaveBeenCalledWith(0);
    expect(sdkMocks.clear).toHaveBeenCalledTimes(1);
    expect(sdkMocks.zswapFromSeed).toHaveBeenCalledWith(sdkMocks.roleKeys[3]);
    expect(sdkMocks.dustFromSeed).toHaveBeenCalledWith(sdkMocks.roleKeys[2]);
    expect(sdkMocks.createKeystore).toHaveBeenCalledWith(
      { kind: 'schnorr', secret: sdkMocks.roleKeys[0] },
      'testnet-02',
    );
  });

  it('initialises the facade with the reference configuration and wallet slots', async () => {
    await createDevSponsorWalletContext(network);

    expect(sdkMocks.init).toHaveBeenCalledTimes(1);
    const [params] = sdkMocks.init.mock.calls[0] as unknown as [
      {
        configuration: Record<string, unknown>;
        shielded: (config: unknown) => unknown;
        unshielded: (config: unknown) => unknown;
        dust: (config: unknown) => unknown;
      },
    ];
    expect(params.configuration).toMatchObject({
      networkId: 'testnet-02',
      indexerClientConnection: {
        indexerHttpUrl: network.indexerUrl,
        indexerWsUrl: network.indexerWsUrl,
      },
      costParameters: { feeBlocksMargin: 100 },
    });
    expect(String(params.configuration.provingServerUrl)).toBe(
      'http://localhost:6300/',
    );
    expect(String(params.configuration.relayURL)).toBe('ws://localhost:9944/');

    expect(params.shielded('shielded-config')).toBe('shielded-wallet');
    expect(sdkMocks.ShieldedWallet).toHaveBeenCalledWith('shielded-config');
    expect(sdkMocks.startWithSecretKeys).toHaveBeenCalledWith(
      'zswap-secret-keys',
    );

    expect(params.unshielded('unshielded-config')).toBe('unshielded-wallet');
    expect(sdkMocks.UnshieldedWallet).toHaveBeenCalledWith('unshielded-config');
    expect(sdkMocks.fromKeyStore).toHaveBeenCalledWith(sdkMocks.keystore);
    expect(sdkMocks.startWithPublicKey).toHaveBeenCalledWith(
      'unshielded-public-key',
    );

    expect(params.dust('dust-config')).toBe('dust-wallet');
    expect(sdkMocks.DustWallet).toHaveBeenCalledWith('dust-config');
    expect(sdkMocks.startWithSecretKey).toHaveBeenCalledWith(
      'dust-secret-key',
      'dust-params',
    );

    expect(sdkMocks.facade.start).toHaveBeenCalledWith(
      'zswap-secret-keys',
      'dust-secret-key',
    );
    expect(sdkMocks.facade.dust.waitForSyncedState).toHaveBeenCalledTimes(1);
  });

  it('honours a custom fee blocks margin', async () => {
    await createDevSponsorWalletContext({ ...network, feeBlocksMargin: 7 });

    const [params] = sdkMocks.init.mock.calls[0] as unknown as [
      { configuration: { costParameters: { feeBlocksMargin: number } } },
    ];
    expect(params.configuration.costParameters).toEqual({
      feeBlocksMargin: 7,
    });
  });

  it('returns a context wired to the keystore signer and the ledger codec', async () => {
    const context = await createDevSponsorWalletContext(network);

    expect(context.wallet).toBe(sdkMocks.facade);
    expect(context.secretKeys).toEqual({
      shieldedSecretKeys: 'zswap-secret-keys',
      dustSecretKey: 'dust-secret-key',
    });

    const payload = new Uint8Array([9]);
    await expect(context.signSegment(payload)).resolves.toBe(
      'segment-signature',
    );
    expect(sdkMocks.keystore.signDataAsync).toHaveBeenCalledWith(payload);

    const bytes = new Uint8Array([4, 2]);
    expect(context.deserializeUnbalanced(bytes)).toBe('deserialized-tx');
    expect(sdkMocks.deserialize).toHaveBeenCalledWith(
      'signature',
      'proof',
      'pre-binding',
      bytes,
    );
  });

  it('rejects a seed that is not valid hex', async () => {
    await expect(
      createDevSponsorWalletContext({ ...network, seedHex: 'xyz' }),
    ).rejects.toThrow('The sponsor seed is not a valid hex string.');
    expect(sdkMocks.fromSeed).not.toHaveBeenCalled();
  });

  it('rejects a seed the HD wallet cannot use', async () => {
    sdkMocks.fromSeed.mockReturnValueOnce({
      type: 'seedError',
      error: new Error('bad seed'),
    } as never);

    await expect(createDevSponsorWalletContext(network)).rejects.toThrow(
      'The sponsor seed is not a valid HD wallet seed.',
    );
  });

  it('rejects an out-of-bounds role key derivation', async () => {
    sdkMocks.deriveKeysAt.mockReturnValueOnce({
      type: 'keyOutOfBounds',
      roles: [3],
    } as never);

    await expect(createDevSponsorWalletContext(network)).rejects.toThrow(
      'The sponsor role key derivation is out of bounds.',
    );
  });
});
