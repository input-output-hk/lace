import { SponsorExhaustedError } from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';

import { applyNetworkId } from './network-id';

import type { Sleep } from './submit';
import type { FeeSponsor } from '@lace-contract/passport';

/**
 * Options of one dust-only balancing pass. `tokenKindsToBalance` is fixed
 * to dust: the sponsor pays fees and must never move the user's shielded
 * or unshielded funds.
 */
export type SponsorBalanceOptions = {
  ttl: Date;
  tokenKindsToBalance: ['dust'];
};

/** Secret keys the facade's balancing takes; opaque to the sponsor. */
export type SponsorSecretKeys = {
  shieldedSecretKeys: unknown;
  dustSecretKey: unknown;
};

/**
 * The slice of the wallet-sdk facade the sponsor drives. Structural, so
 * tests inject a mock and the default context wraps the real facade.
 */
export type SponsorWallet = {
  estimateTransactionFee(
    tx: unknown,
    dustSecretKey: unknown,
    options: { ttl: Date },
  ): Promise<bigint>;
  balanceUnboundTransaction(
    tx: unknown,
    secretKeys: SponsorSecretKeys,
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
 * Everything one sponsoring pass needs: the wallet, its secret keys, the
 * segment signer, and the codec that turns the seam's transaction bytes
 * back into the facade's unbound transaction.
 */
export type SponsorWalletContext = {
  wallet: SponsorWallet;
  secretKeys: SponsorSecretKeys;
  signSegment(payload: Uint8Array): Promise<unknown>;
  deserializeUnbalanced(bytes: Uint8Array): unknown;
};

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
 */
export type DevSponsor = FeeSponsor & {
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
 * and shielded, unshielded, and dust wallets started from those keys.
 * The heavy wallet packages load lazily so platforms that inject their
 * own context never pay for them.
 */
export const createDevSponsorWalletContext = async (
  config: DevSponsorConfig,
): Promise<SponsorWalletContext> => {
  const [
    ledger,
    facadeModule,
    dustModule,
    shieldedModule,
    unshieldedModule,
    hdModule,
    networkIdModule,
  ] = await Promise.all([
    import('@midnightntwrk/ledger-v9'),
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

  await applyNetworkId(config.networkId);
  const networkId = networkIdModule.getNetworkId();
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(
    { kind: 'schnorr', secret: keys[Roles.NightExternal] },
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
    shielded: (shieldedConfiguration: unknown) =>
      ShieldedWallet(
        shieldedConfiguration as Parameters<typeof ShieldedWallet>[0],
      ).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (unshieldedConfiguration: unknown) =>
      UnshieldedWallet(
        unshieldedConfiguration as Parameters<typeof UnshieldedWallet>[0],
      ).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: (dustConfiguration: unknown) =>
      DustWallet(
        dustConfiguration as Parameters<typeof DustWallet>[0],
      ).startWithSecretKey(
        dustSecretKey,
        ledger.LedgerParameters.initialParameters().dust,
      ),
  } as unknown as FacadeInitParams);

  await wallet.start(shieldedSecretKeys, dustSecretKey);
  await wallet.dust.waitForSyncedState();

  return {
    wallet,
    secretKeys: { shieldedSecretKeys, dustSecretKey },
    signSegment: async payload => unshieldedKeystore.signDataAsync(payload),
    deserializeUnbalanced: bytes =>
      ledger.Transaction.deserialize(
        'signature',
        'proof',
        'pre-binding',
        bytes,
      ),
  };
};

/**
 * A development {@link FeeSponsor} over a funded Midnight wallet. Balances
 * ONLY dust into the transaction (the user's tokens are never touched),
 * signs, finalizes, and returns the finalized transaction bytes.
 *
 * A transient dust rejection is retried until the wallet's dust view
 * catches up: each pass first polls the fee estimate, then balances, and
 * waits {@link DUST_FEE_POLL_MS} between attempts. Only a rejection that
 * outlives `dustFeeTimeoutMs` becomes a {@link SponsorExhaustedError}.
 */
export const createDevSponsor = (config: DevSponsorConfig): DevSponsor => {
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

  const balanceWithDustBudget = async (
    { wallet, secretKeys }: SponsorWalletContext,
    tx: unknown,
  ): Promise<unknown> => {
    const deadline = now().getTime() + dustFeeTimeoutMs;
    for (;;) {
      const ttl = new Date(now().getTime() + txTtlMs);
      try {
        await wallet.estimateTransactionFee(tx, secretKeys.dustSecretKey, {
          ttl,
        });
        return await wallet.balanceUnboundTransaction(tx, secretKeys, {
          ttl,
          tokenKindsToBalance: ['dust'],
        });
      } catch (error) {
        if (!DUST_BUDGET_PATTERN.test(errorText(error))) throw error;
        const remaining = deadline - now().getTime();
        if (remaining <= 0) throw new SponsorExhaustedError();
        await sleep(Math.min(DUST_FEE_POLL_MS, remaining));
      }
    }
  };

  const balanceAndSignOnce = async (
    unbalancedTx: Uint8Array,
  ): Promise<Uint8Array> => {
    contextPromise ??= createWalletContext(config);
    const context = await contextPromise;
    const tx = context.deserializeUnbalanced(unbalancedTx);
    const recipe = await balanceWithDustBudget(context, tx);
    const signed = await context.wallet.signRecipe(recipe, context.signSegment);
    const finalized = await context.wallet.finalizeRecipe(signed);
    return finalized.serialize();
  };

  return {
    balanceAndSign: async unbalancedTx =>
      // Serialised on purpose: concurrent balancing double-spends the
      // sponsor's own dust because the wallet's dust view only advances
      // after the previous transaction lands.
      enqueue(async () => balanceAndSignOnce(unbalancedTx)),
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
