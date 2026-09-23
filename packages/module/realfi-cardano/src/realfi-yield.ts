/**
 * Live sUSDr staking APY, computed from RealFi's vault-ratio history
 * (`vaultRatioHistory`) — the same GraphQL feed the RealFi dApp derives its
 * headline APY from. Neither the SDK nor the API exposes a protocol-APY field,
 * so the APY is derived: annualize the sUSDr↔USDr vault-ratio appreciation over
 * a trailing window (Option A — see docs/projects/plans/realfi-usdr-staking).
 *
 * Trailing 30d is used deliberately. On preview the literal 90d window is skewed
 * by one-off test-yield step jumps (a single +10.76% day on 2026-04-13 annualizes
 * the raw 90d endpoints to ~56%), whereas the trailing-30d annualization
 * reproduces the dApp's ~8.3%.
 *
 * Known shortcuts (parity with realfi-stake-activities.ts):
 *  - reads the RealFi GraphQL directly via `fetch` (the ADR-19-correct form is a
 *    provider dependency + side-effect + store slice fed by this feed);
 *  - endpoint + trailing window come from the compiled network config rather
 *    than injected provider configuration.
 */
import { realfiDebugLog } from '@lace-contract/realfi-staking';

import type {
  RealFiSdkNetwork,
  RealFiYieldInfo,
} from '@lace-contract/realfi-staking';

/** RealFi vault ratio is USDr-per-sUSDr scaled by 1e6. */
const VAULT_RATIO_SCALE = 1e6;
/** Trailing window (days) over which the vault-ratio appreciation is annualized. */
const APY_WINDOW_DAYS = 30;
const MS_PER_DAY = 86_400_000;
const DAYS_PER_YEAR = 365;

const VAULT_RATIO_HISTORY_QUERY = `
  query vaultRatioHistory($interval: Interval!, $start: String!, $end: String!) {
    vaultRatioHistory(interval: $interval, start: $start, end: $end) {
      ratioHistory {
        ratio
        unixMilli
        partial
      }
    }
  }
`;

type RatioHistoryItem = { ratio: string; unixMilli: string; partial: boolean };

const graphql = async <T>(
  realfiApiUrl: string,
  body: Record<string, unknown>,
): Promise<T | undefined> => {
  try {
    const response = await fetch(realfiApiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as { data?: T; errors?: unknown };
    if (!response.ok || json.errors) {
      realfiDebugLog('vault-ratio GraphQL error', {
        status: response.status,
        errors: json.errors,
      });
      return undefined;
    }
    return json.data;
  } catch (error) {
    realfiDebugLog('vault-ratio GraphQL fetch failed', { error });
    return undefined;
  }
};

/** RFC3339 without fractional seconds (the API's Go parser expects `...Z`). */
const rfc3339 = (ms: number): string =>
  new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');

type StakingYield = {
  /** Annualized sUSDr APY as a fraction (0.082 = 8.2%). */
  apy: number;
  /** Live USDr backing per 1 sUSDr (vault exchange rate, ≥ 1 as yield accrues). */
  usdrPerSusdr: number;
};

/**
 * Fetches the trailing-window vault-ratio series and derives:
 *  - `apy` = (ratioₙ / ratio₀) ^ (365 / spanDays) − 1
 *  - `usdrPerSusdr` = latest ratio / 1e6
 * Returns `undefined` on any read failure (callers show no yield instead).
 */
export const fetchStakingYield = async (
  realfiApiUrl: string,
): Promise<StakingYield | undefined> => {
  const end = Date.now();
  const start = end - APY_WINDOW_DAYS * MS_PER_DAY;
  const data = await graphql<{
    vaultRatioHistory: { ratioHistory: RatioHistoryItem[] } | null;
  }>(realfiApiUrl, {
    query: VAULT_RATIO_HISTORY_QUERY,
    variables: { interval: 'Daily', start: rfc3339(start), end: rfc3339(end) },
  });
  // Drop partial (still-forming) buckets so the endpoints are settled values.
  const points = (data?.vaultRatioHistory?.ratioHistory ?? []).filter(
    point => !point.partial,
  );
  if (points.length < 2) return undefined;
  const first = points[0];
  const last = points[points.length - 1];
  const r0 = Number(first.ratio);
  const r1 = Number(last.ratio);
  const spanDays =
    (Number(last.unixMilli) - Number(first.unixMilli)) / MS_PER_DAY;
  if (r0 <= 0 || r1 <= 0 || spanDays <= 0) return undefined;
  return {
    apy: (r1 / r0) ** (DAYS_PER_YEAR / spanDays) - 1,
    usdrPerSusdr: r1 / VAULT_RATIO_SCALE,
  };
};

// The diffusion-aware rate inputs — the same query the partner SDK's
// `getSusdrExchangeRateInputs` runs. Queried by hand here because this file is
// page-bundled: importing the SDK root would pull Blaze/Sundae into the tab
// bundle. SW-side code uses the SDK read directly (realfi-exchange-rate.ts).
const SUSDR_EXCHANGE_RATE_INPUTS_QUERY = `
  {
    susdrExchangeRateInputs {
      circulatingSusdr
      vaultUsdr
      pendingYield
      diffusionStartUnixMilli
      diffusionEndUnixMilli
    }
  }
`;

type RawExchangeRateInputs = {
  circulatingSusdr: string;
  vaultUsdr: string;
  pendingYield: string;
  diffusionStartUnixMilli: string;
  diffusionEndUnixMilli: string;
};

const asBigInt = (raw: string | undefined): bigint | undefined =>
  raw !== undefined && /^-?\d+$/.test(raw) ? BigInt(raw) : undefined;

/**
 * Diffusion-aware USDr-per-sUSDr rate, scaled by 1e6 — a mirror of the SDK's
 * `calculateSusdrExchangeRate` (its verbatim port of `utilities.ak`): pending
 * deposited yield releases into the rate linearly over the diffusion window,
 * with the un-diffused remainder rounded UP so settled backing is never
 * overstated. 1:1 when no sUSDr circulates, matching the on-chain convention.
 * Duplicated here (only) because the SDK cannot be page-bundled; keep in step
 * with realfi-exchange-rate.ts.
 */
const settledVaultRatioScaled = (
  inputs: {
    circulatingSusdr: bigint;
    vaultUsdr: bigint;
    pendingYield: bigint;
    diffusionStartUnixMilli: bigint;
    diffusionEndUnixMilli: bigint;
  },
  atTimeMs: bigint,
): bigint => {
  if (inputs.circulatingSusdr <= 0n) return BigInt(VAULT_RATIO_SCALE);
  const {
    pendingYield,
    diffusionStartUnixMilli: start,
    diffusionEndUnixMilli: end,
  } = inputs;
  const pendingRemaining = (() => {
    if (pendingYield <= 0n || atTimeMs >= end) return 0n;
    if (atTimeMs <= start) return pendingYield;
    const span = end - start;
    return (pendingYield * (end - atTimeMs) + span - 1n) / span;
  })();
  return (
    ((inputs.vaultUsdr - pendingRemaining) * BigInt(VAULT_RATIO_SCALE)) /
    inputs.circulatingSusdr
  );
};

/**
 * The current sUSDr→USDr vault exchange rate (USDr backing per 1 sUSDr, ≥ 1),
 * diffusion-aware via `susdrExchangeRateInputs`. Used to value staked sUSDr in
 * USD. Returns `undefined` on any read failure (caller falls back to a 1:1
 * valuation).
 */
export const fetchVaultRate = async (
  realfiApiUrl: string,
): Promise<number | undefined> => {
  const data = await graphql<{
    susdrExchangeRateInputs: RawExchangeRateInputs | null;
  }>(realfiApiUrl, { query: SUSDR_EXCHANGE_RATE_INPUTS_QUERY });
  const raw = data?.susdrExchangeRateInputs;
  const circulatingSusdr = asBigInt(raw?.circulatingSusdr);
  const vaultUsdr = asBigInt(raw?.vaultUsdr);
  const pendingYield = asBigInt(raw?.pendingYield);
  const diffusionStartUnixMilli = asBigInt(raw?.diffusionStartUnixMilli);
  const diffusionEndUnixMilli = asBigInt(raw?.diffusionEndUnixMilli);
  if (
    circulatingSusdr === undefined ||
    vaultUsdr === undefined ||
    pendingYield === undefined ||
    diffusionStartUnixMilli === undefined ||
    diffusionEndUnixMilli === undefined
  ) {
    return undefined;
  }
  const scaled = settledVaultRatioScaled(
    {
      circulatingSusdr,
      vaultUsdr,
      pendingYield,
      diffusionStartUnixMilli,
      diffusionEndUnixMilli,
    },
    BigInt(Date.now()),
  );
  const rate = Number(scaled) / VAULT_RATIO_SCALE;
  return rate > 0 ? rate : undefined;
};

// --- Synchronous cache for the (synchronous) product-card addon --------------
// The Staking Center product card is contributed by a synchronous addon (async
// addons break rendering through the module loader), so it cannot await a
// fetch or read Redux. The per-network APY + vault-rate figures are therefore
// MIRRORED here from the persisted store's `yieldInfoByNetwork` by the
// `makeYieldInfoCache` side-effect — never fetched independently — so the
// Staking Center card and the USDr detail screen (which reads the store
// directly) always present the same value.
const yieldInfoCache: Partial<
  Record<RealFiSdkNetwork, { apy: number | undefined; exchangeRate: number }>
> = {};

// The store-blind product card reads these caches per render, but nothing
// ties the hub's render cycle to their writes — a mirror write landing after
// the hub's last render would never be displayed. Writers notify; the hub
// re-renders through the card contract's `subscribe`.
const cardDataListeners = new Set<() => void>();

const notifyCardDataListeners = (): void => {
  for (const listener of cardDataListeners) listener();
};

/** Notifies on every cache write below; returns the unsubscribe. */
export const subscribeToCardDataChanges = (
  onChange: () => void,
): (() => void) => {
  cardDataListeners.add(onChange);
  return () => {
    cardDataListeners.delete(onChange);
  };
};

/** Overwrite the yield-info mirror with the store's latest per-network map. */
export const setCachedYieldInfoByNetwork = (
  byNetwork: Partial<Record<RealFiSdkNetwork, RealFiYieldInfo>>,
): void => {
  for (const key of Object.keys(yieldInfoCache))
    delete yieldInfoCache[key as RealFiSdkNetwork];
  for (const [network, info] of Object.entries(byNetwork)) {
    yieldInfoCache[network as RealFiSdkNetwork] = {
      apy: info.apy,
      exchangeRate: info.exchangeRate,
    };
  }
  notifyCardDataListeners();
};

/** The store's last-known APY (fraction) for a network, or `undefined` before
 * the first-ever successful read on it — no fabricated fallback; consumers
 * show no yield instead. */
export const getCachedStakingApy = (
  network: RealFiSdkNetwork,
): number | undefined => yieldInfoCache[network]?.apy;

/** The store's last-known vault rate (USDr per sUSDr) for a network, or 1
 * (no premium) before the first-ever successful read on it. */
export const getCachedVaultRate = (network: RealFiSdkNetwork): number =>
  yieldInfoCache[network]?.exchangeRate ?? 1;

// USD earned per staked sUSDr per network — mirrored from the persisted store
// (basis-rate appreciation, LW-14651) by the `makeEarnedUsdCache` side-effect,
// because the store-blind product-card addon can only read module caches.
const earnedUsdPerSusdrCache: Partial<Record<RealFiSdkNetwork, number>> = {};

/** Overwrite the earned-per-sUSDr cache with the store's latest map. */
export const setCachedEarnedUsdPerSusdr = (
  byNetwork: Partial<Record<RealFiSdkNetwork, number>>,
): void => {
  for (const key of Object.keys(earnedUsdPerSusdrCache))
    delete earnedUsdPerSusdrCache[key as RealFiSdkNetwork];
  Object.assign(earnedUsdPerSusdrCache, byNetwork);
  notifyCardDataListeners();
};

/** USD earned per staked sUSDr for a network, or `undefined` until the
 * network's rate has ever been observed — no fabricated zero. */
export const getCachedEarnedUsdPerSusdr = (
  network: RealFiSdkNetwork,
): number | undefined => earnedUsdPerSusdrCache[network];

// Wallet-wide unstaked funds still mid-flow (cooldown + withdraw-ready
// timelocks, USDr base units) — mirrored from the store by the
// `makePendingUnstakeCache` side-effect for the store-blind product card.
// Unkeyed by network ON PURPOSE: the mirrored selector is active-network
// scoped by construction — the contract's `makeNetworkScopeReset` evicts the
// per-account maps on a network switch and the primes refetch, so this cache
// re-emits through '0' to the new network's total. Keying it here would
// duplicate that invariant without a network signal to key on.
const pendingUnstakeCache = { baseUnits: '0' };

/** Overwrite the pending-unstake cache with the store's latest total. */
export const setCachedPendingUnstakeBaseUnits = (baseUnits: string): void => {
  pendingUnstakeCache.baseUnits = baseUnits;
  notifyCardDataListeners();
};

/** Wallet-wide pending-unstake total (USDr base units); '0' until observed. */
export const getCachedPendingUnstakeBaseUnits = (): string =>
  pendingUnstakeCache.baseUnits;
