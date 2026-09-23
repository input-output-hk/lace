import { realfiDebugLog } from '@lace-contract/realfi-staking';
import { Err, Ok } from '@lace-lib/util';
import { catchError, defer, from, map, of } from 'rxjs';

import { claimOrderAttribution } from './realfi-attribution';
import { buildCancelUnsignedTx } from './realfi-cancel-tx';
import { isUsdrTokenId } from './realfi-config';
import { fetchVaultRatioScaled } from './realfi-exchange-rate';
import { fetchSwapCounterpartAssets } from './realfi-partner-config';
import { fetchRPoints } from './realfi-points';
import {
  fetchCooldownUnlockMs,
  fetchCoolingDownUnstakes,
  fetchWithdrawableUnstakes,
  getStakeActivities,
} from './realfi-stake-activities';
import {
  buildStakeUnsignedTx,
  buildUnstakeUnsignedTx,
  fetchBuildableStakeInputs,
  fetchOrderFeesBps,
  quoteSwapToUsdr,
  txFeeLovelace,
} from './realfi-stake-tx';
import {
  susdrOutForUsdr,
  usdrOutForSusdr,
  vaultRateNumbers,
} from './realfi-vault-rate';
import { buildWithdrawUnsignedTx } from './realfi-withdraw-tx';
import { fetchStakingYield, fetchVaultRate } from './realfi-yield';

import type { RealFiBlockfrostConfig } from './realfi-blockfrost';
import type { RealFiNetworkConfig } from './realfi-config';
import type { Percent } from '@cardano-sdk/util';
import type {
  RealFiActivityRequest,
  RealFiAttributionClaim,
  RealFiAttributionRequest,
  RealFiCoolingDownUnstake,
  RealFiBuildRequest,
  RealFiBundledTransaction,
  RealFiCancelRequest,
  RealFiProvider,
  RealFiProviderError,
  RealFiRPoints,
  RealFiSorQuote,
  RealFiSorQuoteRequest,
  RealFiStakeActivity,
  RealFiStakeInputAssetsRequest,
  RealFiWithdrawableUnstake,
  RealFiWithdrawRequest,
} from '@lace-contract/realfi-staking';
import type { Milliseconds, Result } from '@lace-lib/util';
import type { Observable } from 'rxjs';

// Base units → USD for USDr (≈ $1) / stablecoins; all preview stake assets use
// 6 decimals.
const SWAP_DECIMALS = 6;

const QUOTE_TTL_MS = 60_000;

/** Wallet token id → route-leg display id (ADA's wallet id is `lovelace`). */
const routeTokenId = (walletTokenId: string): string =>
  walletTokenId === 'lovelace' ? 'ada' : walletTokenId;

/**
 * Fee lines (base units): the exact network fee from the dry-run build, plus
 * the service fee — the SundaeSwap pool fee (`findPoolDataByIdent` LP
 * `currentFee` + `protocolFee`) on the swapped amount and RealFi's per-action
 * minimum fee (partner-SDK `orderFees`, bps) on the minted/redeemed amount.
 * A zero-amount leg contributes nothing.
 */
const feeLines = (
  networkFeeLovelace: bigint,
  swapFee: { baseUnits: number; poolFeeFraction: number },
  realfiFee: { baseUnits: number; bps: number; tokenId: string },
): Pick<RealFiSorQuote, 'networkFee' | 'serviceFee' | 'serviceFeeTokenId'> => {
  const serviceFee =
    Math.round(swapFee.baseUnits * swapFee.poolFeeFraction) +
    Math.round((realfiFee.baseUnits * realfiFee.bps) / 10_000);
  return {
    networkFee: networkFeeLovelace.toString(),
    serviceFee: String(serviceFee),
    serviceFeeTokenId: realfiFee.tokenId,
  };
};

// The dry-run build consumes the same inputs `buildBundledTx` will, so the
// quoted network fee IS the balanced tx's fee, not an estimate.
const dryRunContext = (
  request: RealFiSorQuoteRequest,
  config: RealFiNetworkConfig,
) => ({
  config,
  changeAddressBech32: request.userAddress,
  utxos: request.utxos,
  protocolParameters: request.protocolParameters,
  ttlSeconds: request.ttl,
});

/**
 * Live stake quote: SundaeSwap swap-leg output + price impact from pool
 * reserves, the diffusion-aware sUSDr↔USDr vault rate
 * (SDK `susdrExchangeRateInputs` — settled backing, not raw balance),
 * RealFi's order fee from the partner SDK's `orderFees`, and the exact
 * network fee from dry-run-building the same unsigned order `buildBundledTx`
 * would produce. Any failed read rejects (surfaced upstream) — the quote never
 * falls back to invented numbers.
 */
const buildStakeQuote = async (
  request: RealFiSorQuoteRequest,
  config: RealFiNetworkConfig,
  blockfrost: RealFiBlockfrostConfig,
): Promise<RealFiSorQuote> => {
  const [ratio, orderFees, networkFeeLovelace] = await Promise.all([
    // Diffusion-aware sUSDr↔USDr vault rate (staking is not 1:1 — the vault
    // appreciates; on v1_1 pending yield diffuses in linearly).
    fetchVaultRatioScaled(config.realfiNetwork),
    fetchOrderFeesBps(config),
    buildStakeUnsignedTx({
      ...dryRunContext(request, config),
      inputTokenId: request.inputTokenId,
      inputAmount: BigInt(request.inputAmount),
      blockfrost,
    }).then(({ unsignedTxCbor }) => txFeeLovelace(unsignedTxCbor)),
  ]);
  if (ratio === undefined) {
    throw new Error('RealFi vault rate unavailable — cannot quote');
  }
  const base = {
    quoteId: `sor-stake-${request.accountId}-${Date.now()}`,
    kind: 'stake' as const,
    inputAmount: request.inputAmount,
    quoteExpiresAt: (Date.now() + QUOTE_TTL_MS) as Milliseconds,
  };
  // The mint fee is charged on the USDr staked; USDr out is proportional to the
  // input, so in input base units the fee is simply bps × input.
  const realfiFee = {
    baseUnits: Number(request.inputAmount),
    bps: orderFees.mintBps,
  };

  // USDr input → stake-only: no swap leg, so no price impact. sUSDr received is
  // the staked USDr at the vault rate; exchange rate shown is USDr per sUSDr.
  if (isUsdrTokenId(request.inputTokenId, config.usdrTokenId)) {
    const susdrOut = susdrOutForUsdr(BigInt(request.inputAmount), ratio);
    return {
      ...base,
      estimatedOutput: susdrOut.toString(),
      route: [{ venue: 'RealFi', fromTokenId: 'usdr', toTokenId: 'susdr' }],
      priceImpact: 0 as Percent,
      priceImpactUsd: '0',
      exchangeRate: vaultRateNumbers(ratio).usdrPerSusdr,
      ...feeLines(
        networkFeeLovelace,
        { baseUnits: 0, poolFeeFraction: 0 },
        { ...realfiFee, tokenId: request.inputTokenId },
      ),
    };
  }
  const { usdrOut, priceImpact, poolFeeFraction } = await quoteSwapToUsdr({
    config,
    inputTokenId: request.inputTokenId,
    inputAmount: BigInt(request.inputAmount),
  });
  const susdrOut = susdrOutForUsdr(usdrOut, ratio);
  const usdrOutUsd = Number(usdrOut) / 10 ** SWAP_DECIMALS;
  const inputDecimal = Number(request.inputAmount) / 10 ** SWAP_DECIMALS;
  const susdrOutDecimal = Number(susdrOut) / 10 ** SWAP_DECIMALS;
  return {
    ...base,
    // sUSDr received = swapped USDr converted at the vault rate.
    estimatedOutput: susdrOut.toString(),
    route: [
      {
        venue: 'SundaeSwap V3',
        fromTokenId: routeTokenId(request.inputTokenId),
        toTokenId: 'usdr',
      },
      { venue: 'RealFi', fromTokenId: 'usdr', toTokenId: 'susdr' },
    ],
    priceImpact: priceImpact as Percent,
    priceImpactUsd: (priceImpact * usdrOutUsd).toFixed(6),
    // Input per sUSDr received (e.g. ADA per sUSDr); 0 when nothing is received.
    exchangeRate: susdrOutDecimal > 0 ? inputDecimal / susdrOutDecimal : 0,
    ...feeLines(
      networkFeeLovelace,
      { baseUnits: Number(request.inputAmount), poolFeeFraction },
      { ...realfiFee, tokenId: request.inputTokenId },
    ),
  };
};

/**
 * Live unstake quote — sUSDr → USDr at the live diffusion-aware vault rate
 * (SDK `susdrExchangeRateInputs`). The output is USDr only (product decision —
 * no swap-back leg); a request naming any other output token is rejected. The
 * redeem fee comes from the partner SDK's `orderFees`; the network fee from
 * the dry-run build. Any failed read rejects — no invented fallback numbers.
 */
const buildUnstakeQuote = async (
  request: RealFiSorQuoteRequest,
  config: RealFiNetworkConfig,
  blockfrost: RealFiBlockfrostConfig,
): Promise<RealFiSorQuote> => {
  const outputTokenId = request.outputTokenId ?? config.usdrTokenId;
  if (!isUsdrTokenId(outputTokenId, config.usdrTokenId)) {
    throw new Error('Unstake output is locked to USDr');
  }
  const [ratio, orderFees, networkFeeLovelace] = await Promise.all([
    // Diffusion-aware sUSDr↔USDr vault rate (SDK `susdrExchangeRateInputs`).
    fetchVaultRatioScaled(config.realfiNetwork),
    fetchOrderFeesBps(config),
    buildUnstakeUnsignedTx({
      ...dryRunContext(request, config),
      susdrAmount: BigInt(request.inputAmount),
      blockfrost,
    }).then(txFeeLovelace),
  ]);
  if (ratio === undefined) {
    throw new Error('RealFi vault rate unavailable — cannot quote');
  }
  const susdrIn = BigInt(request.inputAmount);
  const usdrOut = usdrOutForSusdr(susdrIn, ratio);
  // The redeem fee is charged on the USDr released by the vault.
  const realfiFee = { baseUnits: Number(usdrOut), bps: orderFees.redeemBps };
  return {
    quoteId: `sor-unstake-${request.accountId}-${Date.now()}`,
    kind: 'unstake' as const,
    inputAmount: request.inputAmount,
    quoteExpiresAt: (Date.now() + QUOTE_TTL_MS) as Milliseconds,
    estimatedOutput: usdrOut.toString(),
    route: [{ venue: 'RealFi', fromTokenId: 'susdr', toTokenId: 'usdr' }],
    priceImpact: 0 as Percent,
    priceImpactUsd: '0',
    exchangeRate: vaultRateNumbers(ratio).usdrPerSusdr,
    ...feeLines(
      networkFeeLovelace,
      { baseUnits: 0, poolFeeFraction: 0 },
      { ...realfiFee, tokenId: config.usdrTokenId },
    ),
  };
};

export type RealFiProviderConfig = {
  /**
   * Resolve Lace's per-network Blockfrost client config — the proxy `baseUrl`
   * (key injected server-side, LW-14499) plus an optional direct `projectId`.
   * Returns `undefined` when Lace has no Blockfrost access for the network
   * (the provider then reports unavailable).
   *
   * `buildBundledTx` no longer needs this (it balances against redux-supplied
   * UTxOs via Lace's `TransactionBuilder`, no chain provider call) — it's still
   * consulted by `buildCancelTx` (Blaze-only SDK cancel builders),
   * `buildWithdrawTx` (Blockfrost REST reads), and `getWithdrawableUnstakes`.
   */
  resolveBlockfrostClientConfig: (
    config: RealFiNetworkConfig,
  ) => RealFiBlockfrostConfig | undefined;
};

const UNSUPPORTED_NETWORK_ERROR: RealFiProviderError = {
  code: 'PROVIDER_UNAVAILABLE',
  message: 'RealFi is not available on the active network',
};

/**
 * RealFi provider. Quote/build act on the per-network config carried on
 * `request.config` (resolved from the REALFI flag payload by the side-effect):
 * `getSorQuote` reads live SundaeSwap pool data (GraphQL) plus the
 * diffusion-aware sUSDr↔USDr vault rate (SDK `susdrExchangeRateInputs`),
 * RealFi's order fee from the partner SDK's `orderFees`, and
 * the exact network fee from a dry-run of the same build `buildBundledTx`
 * runs — order composition balanced with Lace's `TransactionBuilder` against
 * the request's redux-supplied UTxOs. Quote/build additionally need the
 * Blockfrost credential: order legs come from the SDK's version-aware
 * builders, and protocol-version detection is an on-chain + RealFi-backend
 * read (realfi-sdk.ts). A failed quote read reports
 * `PROVIDER_UNAVAILABLE` (never a fallback quote); `buildCancelTx`,
 * `buildWithdrawTx`, and `getWithdrawableUnstakes` report it when no Blockfrost
 * credential exists for their chain reads.
 */

/**
 * Classify a thrown build failure as a compliance-gate refusal, per RealFi's
 * contract for `ComplianceGateError`: `pending_review` means the wallet is
 * still being screened; `not_authorized` WITH a correlationId means the wallet
 * failed screening; without one (or any other state — RealFi is renaming this
 * case to `unavailable`) the screening service itself could not be reached.
 * Matched by error name, not instanceof, so it survives bundling.
 */
const complianceCodeOf = (
  error: unknown,
): Extract<RealFiProviderError['code'], `COMPLIANCE_${string}`> | undefined => {
  if (!(error instanceof Error) || error.name !== 'ComplianceGateError') {
    return undefined;
  }
  const { state, correlationId } = error as Error & {
    state?: string;
    correlationId?: string;
  };
  if (state === 'pending_review') return 'COMPLIANCE_PENDING_REVIEW';
  if (state === 'not_authorized' && correlationId) {
    return 'COMPLIANCE_NOT_AUTHORIZED';
  }
  return 'COMPLIANCE_UNAVAILABLE';
};

/**
 * Provider failure policy (ADR-15 transparent retry): anything that THROWS is
 * transport-grade and is rethrown, so the requesting side-effect's
 * `retryBackoff` sees a real error notification and can retry; the
 * side-effect's own catchError maps the final failure once retries are
 * exhausted. Wrapping every throw in `Err` (the previous behavior) parked
 * failures on the success channel, where retryBackoff could never fire.
 * Deliberate `Err`s (no credential, compliance refusal, locked output) remain
 * definitive answers and are never retried.
 */
const rethrowForRetry =
  (operation: string) =>
  (error: unknown): never => {
    realfiDebugLog(`provider: ${operation} FAILED`, { error });
    throw error;
  };

export const createRealFiProvider = (
  config: RealFiProviderConfig,
): RealFiProvider => ({
  getSorQuote: (request: RealFiSorQuoteRequest) => {
    const netConfig = request.config;
    // Both quote kinds dry-run the version-aware build, and protocol-version
    // detection is a Blockfrost-backed read (realfi-sdk.ts).
    const blockfrost = config.resolveBlockfrostClientConfig(netConfig);
    if (!blockfrost) {
      return of(Err<RealFiProviderError>(UNSUPPORTED_NETWORK_ERROR));
    }
    // defer: create the promise per subscription so retryBackoff re-invokes
    // the fetch on retry instead of replaying a settled rejection (ADR-15).
    return defer(() =>
      from(
        request.kind === 'stake'
          ? buildStakeQuote(request, netConfig, blockfrost)
          : buildUnstakeQuote(request, netConfig, blockfrost),
      ),
    ).pipe(
      map(quote => Ok(quote)),
      catchError(error => {
        realfiDebugLog('provider: getSorQuote FAILED', {
          kind: request.kind,
          inputTokenId: request.inputTokenId,
          outputTokenId: request.outputTokenId,
          inputAmount: request.inputAmount,
          error,
        });
        // A compliance refusal is definitive — Err, never retried. Anything
        // else rethrows for the side-effect's retryBackoff (ADR-15).
        const complianceCode = complianceCodeOf(error);
        if (!complianceCode) throw error;
        return of(
          Err<RealFiProviderError>({
            code: complianceCode,
            message: error instanceof Error ? error.message : String(error),
          }),
        );
      }),
    );
  },
  buildBundledTx: (
    request: RealFiBuildRequest,
  ): Observable<Result<RealFiBundledTransaction, RealFiProviderError>> => {
    // Order composed via the partner SDK, signed + submitted through Lace's
    // tx-executor. Both kinds need the Blockfrost credential for
    // protocol-version detection (realfi-sdk.ts).
    const netConfig = request.config;
    const blockfrost = config.resolveBlockfrostClientConfig(netConfig);
    if (!blockfrost) {
      return of(Err<RealFiProviderError>(UNSUPPORTED_NETWORK_ERROR));
    }
    const context = {
      config: netConfig,
      changeAddressBech32: request.userAddress,
      utxos: request.utxos,
      protocolParameters: request.protocolParameters,
      ttlSeconds: request.ttl,
      blockfrost,
    };
    realfiDebugLog('provider: buildBundledTx requested', {
      kind: request.quote.kind,
      inputTokenId: request.inputTokenId,
      outputTokenId: request.outputTokenId,
      quoteInputAmount: request.quote.inputAmount,
      utxoCount: request.utxos.length,
      ttlSeconds: request.ttl,
    });
    if (
      request.quote.kind === 'unstake' &&
      request.outputTokenId !== undefined &&
      !isUsdrTokenId(request.outputTokenId, netConfig.usdrTokenId)
    ) {
      // Unstake output is locked to USDr (product decision — no swap-back).
      return of(
        Err<RealFiProviderError>({
          code: 'PROVIDER_UNAVAILABLE',
          message: 'Unstake output is locked to USDr',
        }),
      );
    }
    return defer(() =>
      from(
        request.quote.kind === 'unstake'
          ? // Unstake places no attributable order output — RealFi credits the
            // partner on the incoming stake order only.
            buildUnstakeUnsignedTx({
              ...context,
              susdrAmount: BigInt(request.quote.inputAmount),
            }).then(unsignedTxCbor => ({ unsignedTxCbor }))
          : buildStakeUnsignedTx({
              ...context,
              inputTokenId: request.inputTokenId,
              inputAmount: BigInt(request.quote.inputAmount),
            }),
      ),
    ).pipe(
      map(built => Ok<RealFiBundledTransaction>(built)),
      catchError(error => {
        realfiDebugLog('provider: buildBundledTx FAILED', { error });
        // A compliance refusal is definitive — Err, never retried. Anything
        // else rethrows for the side-effect's retryBackoff (ADR-15).
        const complianceCode = complianceCodeOf(error);
        if (!complianceCode) throw error;
        return of(
          Err<RealFiProviderError>({
            code: complianceCode,
            message: error instanceof Error ? error.message : String(error),
          }),
        );
      }),
    );
  },
  claimOrderAttribution: (
    request: RealFiAttributionRequest,
  ): Observable<Result<RealFiAttributionClaim, RealFiProviderError>> => {
    // Blaze + a version-detected SDK instance: `claimOrderAttribution` is an
    // instance method (the standalone helper is not on the SDK's public
    // surface), and the instance carries the partner key and the network
    // preset that resolve the claim endpoint.
    const netConfig = request.config;
    const blockfrost = config.resolveBlockfrostClientConfig(netConfig);
    if (!blockfrost) {
      return of(Err<RealFiProviderError>(UNSUPPORTED_NETWORK_ERROR));
    }
    realfiDebugLog('provider: claimOrderAttribution requested', {
      realfiNetwork: netConfig.realfiNetwork,
      orderOutputIndex: request.orderOutputIndex,
    });
    return defer(() =>
      from(
        claimOrderAttribution({
          config: netConfig,
          blockfrost,
          changeAddressBech32: request.userAddress,
          serializedTx: request.serializedTx,
          orderOutputIndex: request.orderOutputIndex,
        }),
      ),
    ).pipe(
      map(claim => Ok<RealFiAttributionClaim>(claim)),
      catchError(rethrowForRetry('claimOrderAttribution')),
    );
  },
  buildCancelTx: (
    request: RealFiCancelRequest,
  ): Observable<Result<RealFiBundledTransaction, RealFiProviderError>> => {
    // Cancel the pending order at whichever leg it's on (swap → SundaeSwap
    // cancel; stake → RealFi cancel), reclaiming the user's funds. Signed +
    // submitted via Lace's tx-executor.
    const netConfig = request.config;
    const blockfrost = config.resolveBlockfrostClientConfig(netConfig);
    if (!blockfrost) {
      return of(Err<RealFiProviderError>(UNSUPPORTED_NETWORK_ERROR));
    }
    return defer(() =>
      from(
        buildCancelUnsignedTx({
          config: netConfig,
          blockfrost,
          changeAddressBech32: request.userAddress,
          stage: request.stage,
          orderId: request.orderId,
        }),
      ),
    ).pipe(
      map(unsignedTxCbor => Ok<RealFiBundledTransaction>({ unsignedTxCbor })),
      catchError(rethrowForRetry('buildCancelTx')),
    );
  },
  getExchangeRateAndApy: (request: RealFiStakeInputAssetsRequest) => {
    // Live sUSDr APY (trailing-30d vault-ratio annualization) + the
    // diffusion-aware vault exchange rate, read from the FLAG-RESOLVED
    // config's endpoint so a CMS rotation reaches the yield feed. Feeds the
    // persisted per-network yieldInfo store via `makeYieldInfo`, so failures
    // are reported as errors (never a fabricated 0-APY / 1:1 rate): the store
    // keeps its previous value instead of being overwritten by an invented one.
    const netConfig = request.config;
    return defer(() =>
      from(
        Promise.all([
          fetchStakingYield(netConfig.realfiApiUrl),
          fetchVaultRate(netConfig.realfiApiUrl),
        ]),
      ),
    ).pipe(
      map(([stakingYield, exchangeRate]) => {
        if (exchangeRate === undefined) {
          return Err<RealFiProviderError>({
            code: 'PROVIDER_UNAVAILABLE',
            message: 'RealFi vault rate unavailable',
          });
        }
        return Ok({
          // The APY may legitimately be unavailable on a young deployment
          // (annualization needs two settled daily buckets) or on a partial
          // outage; report it as absent — a fabricated 0 would overwrite a
          // good persisted APY in the store (the reducer keeps the previous
          // value when this is undefined).
          apy: stakingYield?.apy as Percent | undefined,
          exchangeRate,
          fetchedAt: Date.now() as Milliseconds,
        });
      }),
      catchError(rethrowForRetry('getExchangeRateAndApy')),
    );
  },
  getStakeInputAssets: (request: RealFiStakeInputAssetsRequest) =>
    defer(() =>
      from(
        (async () => {
          // The live product-curated counterpart list, falling back to the
          // compiled copy when the read fails validation or transport.
          const curated =
            (await fetchSwapCounterpartAssets(request.config)) ??
            request.config.swapCounterpartAssets;
          try {
            return await fetchBuildableStakeInputs(request.config, curated);
          } catch {
            // Discovery down: offer the curated list alone rather than an
            // unverified ADA option that may only quote-fail.
            return curated;
          }
        })(),
      ),
    ).pipe(
      map(assets => Ok<string[]>(assets)),
      catchError(rethrowForRetry('getStakeInputAssets')),
    ),
  getCooldownUnlockTime: (request: RealFiStakeInputAssetsRequest) =>
    defer(() =>
      from(
        fetchCooldownUnlockMs(
          request.config,
          // Chain-tip time reference for the era-proof slot → time conversion.
          config.resolveBlockfrostClientConfig(request.config),
        ),
      ),
    ).pipe(
      map(unlockAtMs => Ok(unlockAtMs as Milliseconds)),
      catchError(rethrowForRetry('getCooldownUnlockTime')),
    ),
  // Off-chain reads (SDK `RealfiApi` → `@blaze-cardano/core`) run here in the
  // provider (service worker), not the Metro UI. The helpers throw on failure;
  // the throw propagates through the side-effect's retryBackoff, and once
  // retries are exhausted the store keeps its previous data.
  getStakeActivities: (request: RealFiActivityRequest) =>
    defer(() =>
      from(
        getStakeActivities({
          config: request.config,
          addressBech32: request.userAddress,
          // Chain-tip time reference for order dates + unstake claimable-at.
          blockfrost: config.resolveBlockfrostClientConfig(request.config),
        }),
      ),
    ).pipe(
      map(activities => Ok<RealFiStakeActivity[]>(activities)),
      catchError(rethrowForRetry('getStakeActivities')),
    ),
  // R-Points read (launch season, LW-15495): the partner SDK's Blaze-free
  // off-chain client, like the other get* reads.
  getRPoints: (request: RealFiActivityRequest) =>
    defer(() => from(fetchRPoints(request.config, request.userAddress))).pipe(
      map(rPoints => Ok<RealFiRPoints>(rPoints)),
      catchError(rethrowForRetry('getRPoints')),
    ),
  getWithdrawableUnstakes: (request: RealFiActivityRequest) =>
    defer(() =>
      from(
        fetchWithdrawableUnstakes(
          request.config,
          request.userAddress,
          // Used to check each timelock UTxO is still unspent (not already claimed).
          config.resolveBlockfrostClientConfig(request.config),
        ),
      ),
    ).pipe(
      map(unstakes => Ok<RealFiWithdrawableUnstake[]>(unstakes)),
      catchError(rethrowForRetry('getWithdrawableUnstakes')),
    ),
  getCoolingDownUnstakes: (request: RealFiActivityRequest) =>
    defer(() =>
      from(
        fetchCoolingDownUnstakes(
          request.config,
          request.userAddress,
          // Chain-tip time reference: exact cooling-vs-withdrawable split.
          config.resolveBlockfrostClientConfig(request.config),
        ),
      ),
    ).pipe(
      map(unstakes => Ok<RealFiCoolingDownUnstake[]>(unstakes)),
      catchError(rethrowForRetry('getCoolingDownUnstakes')),
    ),
  // Batched timelock claim, built with @cardano-sdk (no Blaze). Signed +
  // submitted via Lace's tx-executor (finalize arm in the side-effect).
  buildWithdrawTx: (request: RealFiWithdrawRequest) => {
    const netConfig = request.config;
    const blockfrost = config.resolveBlockfrostClientConfig(netConfig);
    if (!blockfrost) {
      return of(Err<RealFiProviderError>(UNSUPPORTED_NETWORK_ERROR));
    }
    return defer(() =>
      from(
        buildWithdrawUnsignedTx({
          config: netConfig,
          blockfrost,
          changeAddressBech32: request.userAddress,
          unstakes: request.unstakes,
        }),
      ),
    ).pipe(
      map(({ cbor, feeLovelace }) =>
        Ok<RealFiBundledTransaction>({ unsignedTxCbor: cbor, feeLovelace }),
      ),
      catchError(rethrowForRetry('buildWithdrawTx')),
    );
  },
});
