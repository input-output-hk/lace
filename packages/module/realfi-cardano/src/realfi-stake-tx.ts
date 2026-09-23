/**
 * Builds the **unsigned** stake/unstake order transactions for RealFi USDr
 * staking, ready for Lace's tx-executor to sign + submit (ADR-19: all SDK /
 * network calls live here in the module, behind the provider dependency).
 *
 * Pipeline (spec §4.7):
 *   1. discover the pair's pools with the SDK's Sundae discovery (`buildable`
 *      scope) and quote each with the version-neutral `quoteSwap`, keeping the
 *      best-executing pool the calling build path can compose
 *   2. compose + balance the order:
 *      - swap→stake: the SDK's `buildSwapToStakeOrderTx` builds the complete
 *        V3-or-Stableswaps order transaction, routing the swap's guaranteed
 *        USDr into the version-aware stake continuation; Blaze balances it
 *        against the staker's live on-chain UTxOs
 *      - direct-USDr stake: `buildStakeContinuation` supplies the live request
 *        address + datum; Lace's `TransactionBuilder` balances against the
 *        request's redux-supplied UTxOs
 *      - unstake: the SDK's Blaze-hosted `buildUnstakeOrderTx` (version-aware,
 *        timelock + metadata + diffusion-aware floor included). The output is
 *        USDr only, by product decision — the former swap-back leg is gone,
 *        and with it the SDK's deprecated V1_0 pure /tx-builder.
 *
 * Both builders need Lace's Blockfrost client config: protocol-version
 * detection is an on-chain + RealFi-backend read (realfi-sdk.ts), and under
 * per-build detection the version-aware builders fail closed on a stale or
 * unknown version — the guard that prevents building orders a newer
 * deployment cannot execute.
 *
 * All order `min_received` floors are SDK-computed from live protocol
 * settings; realfi-vault-rate.ts math is quote display only.
 */
import { Core, makeValue } from '@blaze-cardano/sdk';
import { Serialization } from '@cardano-sdk/core';
import { realfiDebugLog } from '@lace-contract/realfi-staking';
import { RealfiApi, SundaeSwap } from '@realfi-co/realfi-partner-sdk';
import { addressToRealFiDestination } from '@realfi-co/realfi-partner-sdk/tx-builder';
import { AssetAmount, type IAssetAmountMetadata } from '@sundaeswap/asset';
import { type IPoolData } from '@sundaeswap/core';

import { balanceOrderTx } from './realfi-balance';
import {
  SUNDAE_SWAP_SLIPPAGE,
  USDR_ASSET_NAME_HEX,
  isUsdrTokenId,
} from './realfi-config';
import {
  ORDER_ORIGIN_METADATA_LABEL,
  orderOriginBlazeMetadata,
  orderOriginMetadatum,
} from './realfi-order-metadata';
import {
  orderOutputIndexByAddress,
  orderOutputIndexByInlineDatum,
} from './realfi-order-output';
import { filterBuildableStakeInputs } from './realfi-partner-config';
import { createRealfiBlaze, detectAndCreateRealfiSdk } from './realfi-sdk';

import type { RealFiBlockfrostConfig } from './realfi-blockfrost';
import type { RealFiNetworkConfig } from './realfi-config';
import type { RequiredProtocolParameters } from '@lace-contract/cardano-context';

/** Min-ADA held at the RealFi stake order output (lovelace). */
const ORDER_MIN_ADA = 2_000_000n;

/** Shared build-time context for both the stake and unstake builders. */
export type BuildTxContext = {
  config: RealFiNetworkConfig;
  /** Bech32 address of the staking account (change + receive + order owner). */
  changeAddressBech32: string;
  /** Available account UTxOs, `TransactionUnspentOutput` CBOR hex each. */
  utxos: string[];
  protocolParameters: RequiredProtocolParameters;
  ttlSeconds: number;
  /** Lace's Blockfrost client config, for version detection (realfi-sdk.ts). */
  blockfrost: RealFiBlockfrostConfig;
};

export type BuildStakeTxParams = BuildTxContext & {
  /** Wallet token id of the input asset: `lovelace` or `<policyId><assetNameHex>`. */
  inputTokenId: string;
  /** Input amount in base units. */
  inputAmount: bigint;
};

export type BuildUnstakeTxParams = BuildTxContext & {
  /** sUSDr amount to unstake (base units). */
  susdrAmount: bigint;
};

/** Wallet token id → SundaeSwap `policyId.assetNameHex` form (ADA → "ada.lovelace"). */
const toSundaeAssetId = (walletTokenId: string): string => {
  if (walletTokenId === 'lovelace' || walletTokenId === 'ada.lovelace') {
    return 'ada.lovelace';
  }
  if (walletTokenId.includes('.')) return walletTokenId;
  return `${walletTokenId.slice(0, 56)}.${walletTokenId.slice(56)}`;
};

/** Blaze `makeValue` asset id (concatenated, no dot). */
const toBlazeAssetId = (sundaeAssetId: string): string =>
  sundaeAssetId.replace('.', '');

/**
 * RealFi's per-action minimum-fee policy (bps of the minted/redeemed USDr),
 * from the partner SDK's off-chain `orderFees` read.
 */
export const fetchOrderFeesBps = async (
  config: RealFiNetworkConfig,
): Promise<{ mintBps: number; redeemBps: number }> =>
  RealfiApi.forNetwork(config.realfiNetwork).getOrderFees();

/** Fee (lovelace) of a balanced unsigned tx — the dry-run quote's exact network fee. */
export const txFeeLovelace = (unsignedTxCbor: string): bigint =>
  Serialization.Transaction.fromCbor(Serialization.TxCBOR(unsignedTxCbor))
    .body()
    .fee();

export type SwapLegQuote = {
  /** Expected USDr out for the input (base units). */
  usdrOut: bigint;
  /** Price impact of the swap as a decimal fraction (e.g. 0.0011 = 0.11%). */
  priceImpact: number;
  /**
   * Total pool fee fraction from `findPoolDataByIdent` (LP `currentFee` +
   * `protocolFee`), e.g. 0.003 = 0.3%. Applied to the swapped amount for the fee.
   */
  poolFeeFraction: number;
};

/** Combined pool fee fraction (LP + protocol) from a pool-by-ident response. */
const poolFeeFractionOf = (poolData: {
  currentFee: number;
  protocolFee?: number;
}): number => poolData.currentFee + (poolData.protocolFee ?? 0);

// Pool versions the swap→stake build can compose: V3 and Stableswaps via the
// SDK's `buildSwapToStakeOrderTx`. V4 pools are quotable but never composable
// into a RealFi continuation, so the filter excludes them — a quote must
// never price a pool no order can fill.
const stakeSwapPoolFilter = (pool: IPoolData): boolean =>
  SundaeSwap.isSupportedSundaeSwapVersion(pool.version);

/** The pool's own metadata (decimals) for `assetId`, as a supplied amount. */
const poolAssetAmount = (
  pool: IPoolData,
  assetId: string,
  amount: bigint,
): AssetAmount<IAssetAmountMetadata> => {
  const side = pool.assetA.assetId === assetId ? pool.assetA : pool.assetB;
  return new AssetAmount<IAssetAmountMetadata>(amount, {
    assetId: side.assetId,
    decimals: side.decimals,
  });
};

/**
 * USDr pool discovery, memoized per network for a short TTL. This is the
 * hottest quote-path read: a swap-path quote used to run it twice (dry-run
 * build + swap-leg quote), confirm ran it again, and the stake-input picker
 * once more — ×4-8 backend load per staking attempt, all against the same
 * slowly-changing pool set. Reserves this stale are within quote tolerance
 * (quotes themselves live for QUOTE_TTL_MS and carry slippage floors); a
 * failed read is never cached.
 */
const POOL_DISCOVERY_TTL_MS = 30_000;
const usdrPoolsCache = new Map<
  string,
  { at: number; pools: Promise<IPoolData[]> }
>();
const findUsdrPools = async (
  config: RealFiNetworkConfig,
): Promise<IPoolData[]> => {
  const key = config.realfiNetwork;
  const cached = usdrPoolsCache.get(key);
  if (cached && Date.now() - cached.at < POOL_DISCOVERY_TTL_MS) {
    return cached.pools;
  }
  const usdrSundaeId = `${config.usdrPolicyId}.${USDR_ASSET_NAME_HEX}`;
  const pools = SundaeSwap.forNetwork(config.sundaeNetwork).findPoolsByAsset(
    usdrSundaeId,
    { scope: 'buildable' },
  );
  usdrPoolsCache.set(key, { at: Date.now(), pools });
  pools.catch(() => usdrPoolsCache.delete(key));
  return pools;
};

/**
 * Discover the SundaeSwap pools for a USDr↔counterpart pair and quote the
 * swap against each, returning the best-executing pool with its quote.
 *
 * Discovery uses the SDK's `buildable` scope, not `curated` — the pair itself
 * is already curated upstream (runtime partner-config list with the compiled
 * `swapCounterpartAssets` fallback), so re-fetching RealFi's curation here
 * would only add a request. The version filter narrows to what the swap→stake
 * composer can build, so a pair whose only pools are un-composable fails the
 * quote here rather than building an order no scooper can execute.
 */
const quoteBestPoolSwap = async (params: {
  config: RealFiNetworkConfig;
  counterpartSundaeId: string;
  /** Amount of the counterpart asset funding the swap (base units). */
  suppliedAmount: bigint;
}): Promise<{ pool: IPoolData; quote: SundaeSwap.ISundaeSwapQuote }> => {
  const pools = await findUsdrPools(params.config);
  const candidates = pools.filter(
    pool =>
      (pool.assetA.assetId === params.counterpartSundaeId ||
        pool.assetB.assetId === params.counterpartSundaeId) &&
      stakeSwapPoolFilter(pool),
  );
  if (candidates.length === 0) {
    throw new Error(
      `No composable SundaeSwap pool available for USDr/${params.counterpartSundaeId}`,
    );
  }
  let best: { pool: IPoolData; quote: SundaeSwap.ISundaeSwapQuote } | undefined;
  for (const pool of candidates) {
    const quote = SundaeSwap.quoteSwap({
      pool,
      suppliedAsset: poolAssetAmount(
        pool,
        params.counterpartSundaeId,
        params.suppliedAmount,
      ),
      slippage: SUNDAE_SWAP_SLIPPAGE,
    });
    if (
      !best ||
      quote.estimatedReceived.amount > best.quote.estimatedReceived.amount
    ) {
      best = { pool, quote };
    }
  }
  realfiDebugLog('stake-tx: pool quoted by pair', {
    counterpart: params.counterpartSundaeId,
    candidateCount: candidates.length,
    ident: best?.pool.ident,
    version: best?.pool.version,
  });
  // Loop invariant: candidates is non-empty, so best is always assigned.
  return best as { pool: IPoolData; quote: SundaeSwap.ISundaeSwapQuote };
};

/**
 * Live quote for the input→USDr swap leg via the SDK's version-neutral
 * `quoteSwap` (V3 + Stableswaps — everything the swap→stake composer builds).
 * Used by the SOR quote so the Manage Stake screen shows a dynamic price impact.
 */
export const quoteSwapToUsdr = async (params: {
  config: RealFiNetworkConfig;
  inputTokenId: string;
  inputAmount: bigint;
}): Promise<SwapLegQuote> => {
  const { pool, quote } = await quoteBestPoolSwap({
    config: params.config,
    counterpartSundaeId: toSundaeAssetId(params.inputTokenId),
    suppliedAmount: params.inputAmount,
  });
  return {
    usdrOut: quote.estimatedReceived.amount,
    priceImpact: quote.priceImpact,
    poolFeeFraction: poolFeeFractionOf(pool),
  };
};

/**
 * The stake-input asset ids the picker may offer: RealFi's curated
 * counterparts plus ADA (`ada.lovelace` — the curated partner-config list
 * carries only the stablecoin counterparts, while LW-14681's AC offers "ADA or
 * coins listed in the swapCounterparts"), each verified against live Sundae
 * discovery so an asset with no composable USDr pool is never offered — it
 * would only quote-fail on selection. Uses the same `buildable` scope +
 * version filter as the quote path, so offered === quotable === buildable.
 */
export const fetchBuildableStakeInputs = async (
  config: RealFiNetworkConfig,
  counterpartIds: string[],
): Promise<string[]> => {
  const pools = await findUsdrPools(config);
  return filterBuildableStakeInputs(
    // ADA first: it is the sheet's default input selection when offered.
    [...new Set(['ada.lovelace', ...counterpartIds])],
    pools.filter(stakeSwapPoolFilter),
  );
};

/**
 * A built order transaction plus the index of its order output — the pair
 * RealFi's partner attribution claim names (realfi-attribution.ts).
 */
export type BuiltOrderTx = {
  unsignedTxCbor: string;
  orderOutputIndex: number;
};

export const buildStakeUnsignedTx = async (
  params: BuildStakeTxParams,
): Promise<BuiltOrderTx> => {
  realfiDebugLog('stake-tx: build requested', {
    realfiNetwork: params.config.realfiNetwork,
    inputTokenId: params.inputTokenId,
    inputAmount: params.inputAmount,
    changeAddress: params.changeAddressBech32,
    utxoCount: params.utxos.length,
    ttlSeconds: params.ttlSeconds,
  });
  const staker = Core.Address.fromBech32(params.changeAddressBech32);
  const ownerHash = staker.getProps().paymentPart?.hash;
  if (!ownerHash) {
    throw new Error(
      `Could not derive payment key hash from ${params.changeAddressBech32}`,
    );
  }
  // Version-aware SDK instance: the stake leg's request address, datum schema
  // and `min_received` (SDK-computed from live protocol settings, 50 bps
  // default tolerance) all come from the deployed protocol version — the pure
  // /tx-builder's V1_0 stake path is deprecated and carries no address for
  // preview/mainnet.
  const blazeContext = await createRealfiBlaze(
    params.config,
    params.blockfrost,
    params.changeAddressBech32,
  );
  const sdk = await detectAndCreateRealfiSdk(
    params.config.realfiNetwork,
    blazeContext,
  );
  if (!('buildStakeContinuation' in sdk)) {
    throw new Error(
      `RealFi protocol ${sdk.version} does not support stake continuations`,
    );
  }
  const usdrSundaeAssetId = `${params.config.usdrPolicyId}.${USDR_ASSET_NAME_HEX}`;

  // USDr input → stake-only: no swap leg, the user's USDr is already the
  // "completed swap" output the continuation builder takes as its floor.
  if (isUsdrTokenId(params.inputTokenId, params.config.usdrTokenId)) {
    const continuation = await sdk.buildStakeContinuation({
      swap: {
        minReceived: {
          amount: params.inputAmount,
          metadata: { assetId: usdrSundaeAssetId },
        },
      },
      destination: addressToRealFiDestination(staker),
      owner: { Signature: { key_hash: ownerHash } },
    });
    realfiDebugLog('stake-tx: OStake leg composed', {
      path: 'direct-usdr',
      ownerKeyHash: ownerHash,
      stakeAmount: params.inputAmount,
      orderAddress: continuation.address.toBech32(),
      orderMinAda: ORDER_MIN_ADA,
    });
    const directOutput = new Core.TransactionOutput(
      continuation.address,
      makeValue(ORDER_MIN_ADA, [
        toBlazeAssetId(usdrSundaeAssetId),
        params.inputAmount,
      ]),
    );
    directOutput.setDatum(Core.Datum.newInlineData(continuation.datum));
    const unsignedTxCbor = await balanceOrderTx({
      orderOutputCbor: directOutput.toCbor(),
      metadata: new Map([
        [ORDER_ORIGIN_METADATA_LABEL, orderOriginMetadatum()],
      ]),
      utxos: params.utxos,
      protocolParameters: params.protocolParameters,
      networkMagic: params.config.networkMagic,
      changeAddressBech32: params.changeAddressBech32,
      ttlSeconds: params.ttlSeconds,
    });
    return {
      unsignedTxCbor,
      orderOutputIndex: orderOutputIndexByAddress(
        unsignedTxCbor,
        continuation.address.toBech32(),
      ),
    };
  }

  // Any other input first swaps to USDr on SundaeSwap. The SDK composes the
  // complete swap→stake order transaction — V3 or Stableswaps, which the pure
  // /tx-builder cannot compose (preview's counterpart pairs are exactly that,
  // F1) — deriving the swap floor from the market slippage and routing the
  // guaranteed USDr into the stake continuation. Blaze balances it against the
  // staker's live on-chain UTxOs, so `utxos`/`protocolParameters`/`ttlSeconds`
  // are unused on this path.
  const inputSundaeId = toSundaeAssetId(params.inputTokenId);
  const { pool } = await quoteBestPoolSwap({
    config: params.config,
    counterpartSundaeId: inputSundaeId,
    suppliedAmount: params.inputAmount,
  });
  const composed = await SundaeSwap.buildSwapToStakeOrderTx(
    blazeContext.blaze,
    {
      sdk,
      swap: {
        pool,
        suppliedAsset: poolAssetAmount(pool, inputSundaeId, params.inputAmount),
        swapType: {
          type: SundaeSwap.ESwapType.MARKET,
          slippage: SUNDAE_SWAP_SLIPPAGE,
        },
        ownerAddress: params.changeAddressBech32,
        orderAddresses: {
          DestinationAddress: {
            address: params.changeAddressBech32,
            datum: { type: SundaeSwap.EDatumType.NONE },
          },
        },
      },
    },
  );
  // The SDK's RealFi order builders stamp the origin label themselves; its
  // Sundae composer does not, and the indexer drops unlabelled orders.
  composed.tx.setMetadata(orderOriginBlazeMetadata());
  if (composed.datum === undefined) {
    throw new Error(
      'SundaeSwap composer returned no order datum — cannot locate the order output',
    );
  }
  const built = await composed.build();
  const orderOutputIndex = orderOutputIndexByInlineDatum(
    built.cbor,
    composed.datum,
  );
  realfiDebugLog('stake-tx: swap→stake composed', {
    path: 'swap→stake',
    ownerKeyHash: ownerHash,
    poolIdent: pool.ident,
    poolVersion: pool.version,
    offeredAssetId: inputSundaeId,
    offeredAmount: params.inputAmount,
    orderOutputIndex,
  });
  return { unsignedTxCbor: built.cbor, orderOutputIndex };
};

/**
 * Builds the **unsigned** unstake transaction (sUSDr → USDr release) via the
 * SDK's Blaze-hosted `buildUnstakeOrderTx` — version-aware order address +
 * datum, the cooldown timelock destination and its 55534472 metadata, the
 * origin label, and a diffusion-aware `min_received` computed from live
 * protocol settings. Blaze balances against the staker's live on-chain UTxOs
 * (interim: accepted like cancel until the SDK ships a pure unstake
 * continuation — raised with RealFi).
 *
 * The output is USDr only, by product decision: the released USDr always
 * rests at the cooldown timelock until claimed. The former swap-back leg
 * (USDr → other asset via a routed SundaeSwap order) was removed with that
 * decision — it was also the last consumer of the SDK's deprecated V1_0
 * pure /tx-builder.
 */
export const buildUnstakeUnsignedTx = async (
  params: BuildUnstakeTxParams,
): Promise<string> => {
  realfiDebugLog('unstake-tx: build requested', {
    realfiNetwork: params.config.realfiNetwork,
    susdrAmount: params.susdrAmount,
    changeAddress: params.changeAddressBech32,
    utxoCount: params.utxos.length,
    ttlSeconds: params.ttlSeconds,
  });
  const staker = Core.Address.fromBech32(params.changeAddressBech32);
  const ownerHash = staker.getProps().paymentPart?.hash;
  if (!ownerHash) {
    throw new Error(
      `Could not derive payment key hash from ${params.changeAddressBech32}`,
    );
  }
  const blazeContext = await createRealfiBlaze(
    params.config,
    params.blockfrost,
    params.changeAddressBech32,
  );
  const [sdk, unlockSlot] = await Promise.all([
    detectAndCreateRealfiSdk(params.config.realfiNetwork, blazeContext),
    RealfiApi.forNetwork(params.config.realfiNetwork).getCooldownUnlockSlot(),
  ]);
  const txBuilder = await sdk.buildUnstakeOrderTx({
    amount: params.susdrAmount,
    destination: addressToRealFiDestination(staker),
    unlockSlot,
    owner: { Signature: { key_hash: ownerHash } },
  });
  realfiDebugLog('unstake-tx: SDK unstake order composed', {
    path: 'direct-usdr (timelock)',
    unlockSlot,
    ownerKeyHash: ownerHash,
  });
  return (await txBuilder.complete()).toCbor();
};
