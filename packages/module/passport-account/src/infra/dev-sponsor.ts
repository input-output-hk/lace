import { SponsorExhaustedError } from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';

import { applyNetworkId } from './network-id';

import type { Sleep } from './submit';
import type { FeeSponsor } from '@lace-contract/passport';

/** A token kind the development wallet can balance a transaction in. */
export type DevTokenKind = 'dust' | 'shielded' | 'unshielded';

/**
 * Options of one balancing pass. The fee sponsor fixes
 * `tokenKindsToBalance` to dust: it pays fees and must never move the
 * user's shielded or unshielded funds. A development deposit also
 * balances the kind it sends, from the wallet's own funds.
 */
export type SponsorBalanceOptions = {
  ttl: Date;
  tokenKindsToBalance: DevTokenKind[];
};

/**
 * The slice of the wallet-sdk facade the sponsor drives. Structural, so
 * tests inject a mock and the default context wraps the real facade.
 */
export type SponsorWallet = {
  estimateTransactionFee(tx: unknown, options: { ttl: Date }): Promise<bigint>;
  balanceUnboundTransaction(
    tx: unknown,
    options: SponsorBalanceOptions,
  ): Promise<unknown>;
  signRecipe(
    recipe: unknown,
    signSegment: (payload: Uint8Array) => Promise<unknown>,
  ): Promise<unknown>;
  finalizeRecipe(recipe: unknown): Promise<{ serialize(): Uint8Array }>;
  stop(): Promise<void>;
};

/**
 * Everything one sponsoring pass needs: the wallet, the segment signer,
 * and the adoption that turns the seam's transaction bytes into the
 * facade's unbound transaction handle.
 */
export type SponsorWalletContext = {
  wallet: SponsorWallet;
  signSegment(payload: Uint8Array): Promise<unknown>;
  adoptUnbalanced(bytes: Uint8Array): unknown;
};

/** How `createDevSponsor` reaches the network and the wallet that pays the fees. */
export type DevSponsorConfig = {
  /** Hex seed of the funded development wallet paying the dust fees. */
  seedHex: string;
  /** Midnight network id the wallet libraries operate under. */
  networkId: string;
  /** Indexer GraphQL HTTP endpoint. */
  indexerUrl: string;
  /** Indexer GraphQL WebSocket endpoint. */
  indexerWsUrl: string;
  /** Node RPC endpoint (http(s); the facade derives the ws relay from it). */
  nodeUrl: string;
  /** Proof server endpoint the facade proves dust spends against. */
  proofServerUrl: string;
  /** Transaction TTL in ms (default 60s, the node's fee dismissal window). */
  txTtlMs?: number;
  /**
   * How long one balancing pass may wait for the wallet's dust view to
   * catch up before the pass is declared exhausted (default 10 minutes).
   */
  dustFeeTimeoutMs?: number;
  /** Blocks of fee margin the facade adds when costing (default 100). */
  feeBlocksMargin?: number;
  /** Clock; injected for tests. */
  now?: () => Date;
  /** Waits between dust budget polls; injected for tests. */
  sleep?: Sleep;
  /** Wallet factory; defaults to {@link createDevSponsorWalletContext}. */
  createWalletContext?: (
    config: DevSponsorConfig,
  ) => Promise<SponsorWalletContext>;
};

/**
 * A {@link FeeSponsor} that can also release the wallet it lazily started.
 * `ready` starts the wallet and resolves once it is synced.
 */
export type DevSponsor = FeeSponsor & {
  ready(): Promise<void>;
  stop(): Promise<void>;
};

/**
 * The development wallet's balancing seam: balances a transaction in the
 * given token kinds, signs and finalizes it, starts and syncs the wallet
 * on ready, and releases the wallet it lazily started on stop.
 */
export type DevWalletBalancer = {
  balanceAndSign(
    unbalancedTx: Uint8Array,
    tokenKinds: DevTokenKind[],
  ): Promise<Uint8Array>;
  ready(): Promise<void>;
  stop(): Promise<void>;
};

const TX_TTL_MS = 60_000;
const DUST_FEE_TIMEOUT_MS = 600_000;
const DUST_FEE_POLL_MS = 5000;
const FEE_BLOCKS_MARGIN = 100;

/**
 * The facade's transient dust rejections: the wallet's dust view lags the
 * chain by a sync cycle, so a pass started before the previous fee landed
 * (or before enough dust generated) cannot cover the fee yet.
 */
const DUST_BUDGET_PATTERN = /could not balance dust|insufficient funds/i;

/**
 * The dust rejections alone. When a pass also balances shielded or
 * unshielded tokens, an insufficient funds error that names no dust is
 * the wallet lacking those tokens, which waiting does not cure.
 */
const DUST_ONLY_PATTERN = /dust/i;

const isTransientDustRejection = (
  error: unknown,
  tokenKinds: DevTokenKind[],
): boolean =>
  (tokenKinds.every(kind => kind === 'dust')
    ? DUST_BUDGET_PATTERN
    : DUST_ONLY_PATTERN
  ).test(errorText(error));

const errorText = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

const defaultSleep: Sleep = async ms =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

const hexToBytes = (hex: string): Uint8Array => {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0 || /[^\da-f]/i.test(clean)) {
    throw new Error('The sponsor seed is not a valid hex string.');
  }
  return ByteArray.fromHex(HexBytes(clean));
};

const noopTxHistoryStorage = {
  gotPending: async () => undefined,
  gotFinalized: async () => undefined,
  gotRejected: async () => undefined,
  getAll: async () => [] as unknown[],
  get: async () => undefined,
  serialize: async () => '[]',
};

/**
 * Builds the default sponsor wallet over the Midnight wallet-sdk facade,
 * mirroring the reference node wiring: HD role keys derived from the seed
 * at account 0 index 0, a Schnorr keystore over the Night external key,
 * the shielded and dust wallets started from their role seeds and the
 * unshielded one from the keystore's public key. The facade derives each
 * ledger version's key objects from the seeds itself, so the sponsor holds
 * none of its own. The context is handed out only once all three wallets
 * are synced, so the facade has settled on the chain's protocol version
 * before it adopts the first transaction. A start or sync that fails
 * stops the facade before rejecting, so a retry never leaves an earlier
 * one syncing beside it. The heavy wallet packages load
 * lazily so platforms that inject their own context never pay for them.
 */
export const createDevSponsorWalletContext = async (
  config: DevSponsorConfig,
): Promise<SponsorWalletContext> => {
  const [
    facadeModule,
    dustModule,
    shieldedModule,
    unshieldedModule,
    hdModule,
    networkIdModule,
  ] = await Promise.all([
    import('@midnightntwrk/wallet-sdk-facade'),
    import('@midnightntwrk/wallet-sdk-dust-wallet'),
    import('@midnightntwrk/wallet-sdk-shielded'),
    import('@midnightntwrk/wallet-sdk-unshielded-wallet'),
    import('@midnightntwrk/wallet-sdk-hd'),
    import('@midnight-ntwrk/midnight-js-network-id'),
  ]);
  const { WalletFacade } = facadeModule;
  const { DustWallet } = dustModule;
  const { ShieldedWallet } = shieldedModule;
  const { createKeystore, PublicKey, UnshieldedWallet } = unshieldedModule;
  const { HDWallet, Roles } = hdModule;

  const seedResult = HDWallet.fromSeed(hexToBytes(config.seedHex));
  if (seedResult.type !== 'seedOk') {
    throw new Error('The sponsor seed is not a valid HD wallet seed.');
  }
  const derived = seedResult.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (derived.type !== 'keysDerived') {
    throw new Error('The sponsor role key derivation is out of bounds.');
  }
  seedResult.hdWallet.clear();
  const { keys } = derived;
  const seeds = {
    shielded: keys[Roles.Zswap],
    unshielded: keys[Roles.NightExternal],
    dust: keys[Roles.Dust],
  };

  await applyNetworkId(config.networkId);
  const networkId = networkIdModule.getNetworkId();
  const unshieldedKeystore = createKeystore(
    { kind: 'schnorr', secret: seeds.unshielded },
    networkId,
  );

  const configuration = {
    networkId,
    indexerClientConnection: {
      indexerHttpUrl: config.indexerUrl,
      indexerWsUrl: config.indexerWsUrl,
    },
    provingServerUrl: new URL(config.proofServerUrl),
    relayURL: new URL(config.nodeUrl.replace(/^http/, 'ws')),
    costParameters: {
      feeBlocksMargin: config.feeBlocksMargin ?? FEE_BLOCKS_MARGIN,
    },
    txHistoryStorage: noopTxHistoryStorage,
  };

  type FacadeInitParams = Parameters<(typeof WalletFacade)['init']>[0];
  const wallet = await WalletFacade.init({
    configuration,
    shielded: async (shieldedConfiguration: unknown) =>
      ShieldedWallet(
        shieldedConfiguration as Parameters<typeof ShieldedWallet>[0],
      ).startWithSeed(seeds.shielded),
    unshielded: async (unshieldedConfiguration: unknown) =>
      UnshieldedWallet(
        unshieldedConfiguration as Parameters<typeof UnshieldedWallet>[0],
      ).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: async (dustConfiguration: unknown) =>
      DustWallet(
        dustConfiguration as Parameters<typeof DustWallet>[0],
      ).startWithSeed(seeds.dust),
  } as unknown as FacadeInitParams);

  try {
    await wallet.start(seeds);
    await wallet.waitForSyncedState();
  } catch (error) {
    await wallet.stop().catch(() => undefined);
    throw error;
  }

  return {
    wallet,
    signSegment: async payload => unshieldedKeystore.signDataAsync(payload),
    adoptUnbalanced: bytes => wallet.adoptTransaction(bytes, 'Unbound'),
  };
};

/**
 * Balances transactions from a funded development wallet in the token
 * kinds each call names, signs, finalizes, and returns the finalized
 * transaction bytes. The wallet starts lazily on the first call, or on
 * `ready`, which resolves once it is synced. A start that fails is not
 * kept, so the next call starts the wallet afresh.
 *
 * A transient dust rejection is retried until the wallet's dust view
 * catches up: each pass first polls the fee estimate, then balances, and
 * waits {@link DUST_FEE_POLL_MS} between attempts. Only a rejection that
 * outlives `dustFeeTimeoutMs` becomes a {@link SponsorExhaustedError}.
 */
export const createDevWalletBalancer = (
  config: DevSponsorConfig,
): DevWalletBalancer => {
  const {
    txTtlMs = TX_TTL_MS,
    dustFeeTimeoutMs = DUST_FEE_TIMEOUT_MS,
    now = () => new Date(),
    sleep = defaultSleep,
    createWalletContext = createDevSponsorWalletContext,
  } = config;

  let contextPromise: Promise<SponsorWalletContext> | undefined;
  let queue: Promise<unknown> = Promise.resolve();

  const enqueue = async <T>(job: () => Promise<T>): Promise<T> => {
    const result = queue.then(job);
    queue = result.catch(() => undefined);
    return result;
  };

  const walletContext = async (): Promise<SponsorWalletContext> => {
    if (contextPromise) return contextPromise;
    const started = createWalletContext(config).catch((error: unknown) => {
      if (contextPromise === started) contextPromise = undefined;
      throw error;
    });
    contextPromise = started;
    return started;
  };

  const balanceWithDustBudget = async (
    { wallet }: SponsorWalletContext,
    tx: unknown,
    tokenKinds: DevTokenKind[],
  ): Promise<unknown> => {
    const deadline = now().getTime() + dustFeeTimeoutMs;
    for (;;) {
      const ttl = new Date(now().getTime() + txTtlMs);
      try {
        await wallet.estimateTransactionFee(tx, { ttl });
        return await wallet.balanceUnboundTransaction(tx, {
          ttl,
          tokenKindsToBalance: tokenKinds,
        });
      } catch (error) {
        if (!isTransientDustRejection(error, tokenKinds)) throw error;
        const remaining = deadline - now().getTime();
        if (remaining <= 0) throw new SponsorExhaustedError();
        await sleep(Math.min(DUST_FEE_POLL_MS, remaining));
      }
    }
  };

  const balanceAndSignOnce = async (
    unbalancedTx: Uint8Array,
    tokenKinds: DevTokenKind[],
  ): Promise<Uint8Array> => {
    const context = await walletContext();
    const tx = context.adoptUnbalanced(unbalancedTx);
    const recipe = await balanceWithDustBudget(context, tx, tokenKinds);
    const signed = await context.wallet.signRecipe(recipe, context.signSegment);
    const finalized = await context.wallet.finalizeRecipe(signed);
    return finalized.serialize();
  };

  return {
    balanceAndSign: async (unbalancedTx, tokenKinds) =>
      // Serialised on purpose: concurrent balancing double-spends the
      // wallet's own dust because the wallet's dust view only advances
      // after the previous transaction lands.
      enqueue(async () => balanceAndSignOnce(unbalancedTx, tokenKinds)),
    ready: async () => {
      await walletContext();
    },
    stop: async () =>
      enqueue(async () => {
        if (!contextPromise) return;
        const pending = contextPromise;
        contextPromise = undefined;
        const { wallet } = await pending;
        await wallet.stop();
      }),
  };
};

/**
 * A development {@link FeeSponsor} over a funded Midnight wallet. Balances
 * ONLY dust into the transaction (the user's tokens are never touched),
 * signs, finalizes, and returns the finalized transaction bytes, with the
 * dust retry of {@link createDevWalletBalancer}. Its first sync can take
 * minutes on a public network, so `ready` may be called when the host
 * loads to start it before the first flow needs it.
 */
export const createDevSponsor = (config: DevSponsorConfig): DevSponsor => {
  const balancer = createDevWalletBalancer(config);
  return {
    balanceAndSign: async unbalancedTx =>
      balancer.balanceAndSign(unbalancedTx, ['dust']),
    ready: async () => balancer.ready(),
    stop: async () => balancer.stop(),
  };
};
