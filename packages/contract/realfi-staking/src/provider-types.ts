import type { RealFiNetworkConfig } from './realfi-network-config';
import type { Percent } from '@cardano-sdk/util';
import type { RequiredProtocolParameters } from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Milliseconds, Result } from '@lace-lib/util';
import type { Observable } from 'rxjs';

// --- Error model (mirrors SwapProviderError) ---

// The COMPLIANCE_* codes mean the partner SDK's compliance gate refused (or
// could not run) the wallet screening a stake/unstake build requires. Split by
// ComplianceGateError state so the UI can message each case distinctly (per
// RealFi's dApp): still screening / screening refused / service unreachable.
export type RealFiErrorCode =
  | 'COMPLIANCE_NOT_AUTHORIZED'
  | 'COMPLIANCE_PENDING_REVIEW'
  | 'COMPLIANCE_UNAVAILABLE'
  | 'INSUFFICIENT_LIQUIDITY'
  | 'NO_ROUTE'
  | 'PROVIDER_UNAVAILABLE'
  | 'SLIPPAGE_EXCEEDED'
  | 'TIMEOUT'
  | 'UNKNOWN'
  | 'VALIDATION';

export type RealFiProviderError = {
  code: RealFiErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

// --- SOR quote / route ---

/** A single leg of the bundled route, e.g. ADA→stablecoin via SundaeSwap V3. */
export type RealFiRouteLeg = {
  /** DEX or protocol name for display, e.g. "SundaeSwap V3" / "RealFi". */
  venue: string;
  fromTokenId: string;
  toTokenId: string;
};

export type RealFiSorQuoteRequest = {
  /** Resolved RealFi config for the active network (from the REALFI flag payload). */
  config: RealFiNetworkConfig;
  accountId: AccountId;
  userAddress: string;
  /** 'stake': input ADA → est. sUSDr. 'unstake': input sUSDr → est. ADA. */
  kind: 'stake' | 'unstake';
  /** Wallet token id of the swap input: `lovelace` or `<policyId><assetNameHex>`. */
  inputTokenId: string;
  /**
   * Desired output token id (unstake only): `lovelace` / `<policyId><nameHex>`.
   * The redeemed USDr is swapped to this. USDr itself ⇒ no swap. Ignored for stake.
   */
  outputTokenId?: string;
  /** Input amount, base units (ADA for stake, sUSDr for unstake). */
  inputAmount: string;
  /**
   * The account's available UTxOs (`TransactionUnspentOutput` CBOR hex, from
   * redux) — the quote dry-run-builds the order to price the exact network fee.
   */
  utxos: string[];
  /** Protocol parameters at quote time (dry-run fee balancing). */
  protocolParameters: RequiredProtocolParameters;
  /** Tx TTL (seconds) for the dry-run build. */
  ttl: number;
};

export type RealFiSorQuote = {
  quoteId: string;
  kind: 'stake' | 'unstake';
  inputAmount: string;
  /** Estimated output, base units (sUSDr for stake, ADA for unstake). */
  estimatedOutput: string;
  route: RealFiRouteLeg[];
  /** Aggregate price impact across the route. */
  priceImpact: Percent;
  /** Price-impact value in USD (absolute, formatted, e.g. "33.51"); undefined if unknown. */
  priceImpactUsd?: string;
  /** "1 USDr = 1 sUSDr" staking leg; swap legs at market. */
  exchangeRate: number;
  /** Network fee, lovelace base units. */
  networkFee: string;
  /** RealFi's per-order processing fee, lovelace base units ("0" when none). */
  processingFee: string;
  /** Service fee in `serviceFeeTokenId` base units (pool fee + RealFi bps fee). */
  serviceFee: string;
  /**
   * Denomination of `serviceFee`: the swap-input token on stake, USDr on
   * unstake. The UI converts to ADA + fiat via live prices — the two fees are
   * NOT summable as raw base units.
   */
  serviceFeeTokenId: string;
  quoteExpiresAt: Milliseconds;
};

// --- Build (bundled order tx) ---

export type RealFiBuildRequest = {
  /** Resolved RealFi config for the active network (from the REALFI flag payload). */
  config: RealFiNetworkConfig;
  quote: RealFiSorQuote;
  /** Bech32 address of the staking account (change + receive + order owner). */
  userAddress: string;
  /** Wallet token id of the swap input: `lovelace` or `<policyId><assetNameHex>`. */
  inputTokenId: string;
  /** Desired output token id (unstake only); USDr ⇒ no swap. Ignored for stake. */
  outputTokenId?: string;
  /**
   * The account's available UTxOs (pending-tx aware, from redux), each a
   * `TransactionUnspentOutput` CBOR hex. The provider balances against these —
   * it must not re-fetch the UTxO set from a chain provider.
   */
  utxos: string[];
  collateralUtxos: string[];
  /** Protocol parameters at build time (fee / min-ADA / balancing). */
  protocolParameters: RequiredProtocolParameters;
  ttl: number;
};

export type RealFiBundledTransaction = {
  /** Order output (address + inline datum + value) from SDK /tx-builder. */
  unsignedTxCbor: string;
  /**
   * Index of the order output RealFi's partner attribution claim names — the
   * Sundae swap order on the swap→stake path, the RealFi stake order on the
   * direct path. Absent on builds that place no claimable order (unstake,
   * cancel, withdraw); the finalize arm then skips the claim.
   */
  orderOutputIndex?: number;
  /**
   * The built tx's exact ledger fee (lovelace), when the builder computes it
   * locally (the withdraw claim tx). Lets the claim sheet quote the real fee
   * via a dry-run build instead of a flat upper bound (LW-14684).
   */
  feeLovelace?: string;
};

// --- Cancel (reclaim a pending order) ---

/** Which leg of the flow the pending order is at. */
export type RealFiCancelStage = 'stake' | 'swap';

export type RealFiCancelRequest = {
  /** Resolved RealFi config for the active network (from the REALFI flag payload). */
  config: RealFiNetworkConfig;
  accountId: AccountId;
  /** Staker bech32 address (order owner + refund destination). */
  userAddress: string;
  /** SundaeSwap swap-order id "txHash#index" (used at the swap stage). */
  orderId: string;
  stage: RealFiCancelStage;
};

// --- Yield / exchange-rate feed ---

export type RealFiExchangeRateAndApy = {
  /**
   * sUSDr APY shown on card + detail; `undefined` when the annualization feed
   * is unavailable (young deployment or partial outage) — never a fabricated
   * 0, which would overwrite a good persisted APY in the store.
   */
  apy?: Percent;
  /** Current sUSDr↔USDr exchange rate (≈1 staking leg). */
  exchangeRate: number;
  fetchedAt: Milliseconds;
};

// --- Staking activity history (read via the off-chain API in the provider) ---

export type RealFiActivityKind =
  | 'other'
  | 'stake'
  | 'swap'
  | 'unstake'
  | 'withdraw';
export type RealFiActivityStepKey =
  | 'received'
  | 'stake'
  | 'swap'
  | 'unstake'
  | 'withdrawn';
/**
 * `failed` = the order reached a terminal state without executing
 * (`Invalidated`, or `InvalidMinReceived` — a floor no batch can clear);
 * `canceled` = the owner reclaimed it. Both are final: without them a dead
 * order renders as in-progress forever.
 */
export type RealFiActivityStepStatus =
  | 'active'
  | 'canceled'
  | 'completed'
  | 'failed'
  | 'pending';
export type RealFiActivityStep = {
  key: RealFiActivityStepKey;
  status: RealFiActivityStepStatus;
};

/** A display-ready staking-history row (serializable — stored in redux). */
export type RealFiStakeActivity = {
  /** Stable id (order id / tx hash). */
  id: string;
  kind: RealFiActivityKind;
  /** Display label (stake/unstake are localised in the UI). */
  label: string;
  /** Pre-formatted amount line, e.g. "-8,261.71 USDr". */
  subtitle: string;
  /**
   * The amount as structured data — USDr base units — for rows that PERSIST
   * (the optimistic withdraw row): the UI formats it with the active locale at
   * render time, so an es/ja user never sees the en-US `subtitle` frozen in at
   * claim time. Absent on read-derived rows (their `subtitle` is rebuilt in
   * the active locale on every read, so it is never stale).
   */
  usdrBaseUnits?: string;
  /**
   * Swap→stake rows only: the USDr actually staked (base units) for the detail
   * sheet's "Stake amount" line — the matched stake order's amount once the
   * downstream stake is merged in, else the swap's received USDr as the pending
   * estimate. Kept separate from `subtitle` (which the activities LIST still
   * renders as the combined "+received USDr, -input" line) and from
   * `usdrBaseUnits` (persisted-withdraw localisation) so neither is affected.
   */
  stakedUsdrBaseUnits?: string;
  /**
   * Swap→stake rows only: the USDr the swap was quoted to return (base units)
   * — SundaeSwap's expected output, or the guaranteed minimum for a V4 intent,
   * which carries no estimate. Shown beside the staked amount, which can be
   * lower. Absent when Sundae reports neither.
   */
  quotedUsdrBaseUnits?: string;
  /**
   * Swap→stake rows only: the input-token line (e.g. "-524.234 ADA") for the
   * detail sheet's separate "Swap value" line.
   */
  swapInputLine?: string;
  /** Positive (completed) vs neutral (pending) activity icon. */
  completed: boolean;
  /** Wall-clock of the order, milliseconds (date grouping + sorting). */
  requestDate: number;
  /**
   * Unstake rows only: wall-clock (epoch ms) the released USDr becomes
   * claimable (the cooldown timelock opens). Undefined for other kinds and
   * when the order carries no timelock.
   */
  claimableAt?: number;
  /**
   * Unstake rows whose cooldown has ended (LW-14653): wall-clock (epoch ms)
   * the unstake completed — the cooldown end. Stakes carry no completion
   * date: they execute within minutes of submission, so the request date is
   * the completion date (per ticket); the UI omits the row rather than
   * duplicating it.
   */
  completedAt?: number;
  /** Ordered legs (swap → stake → received) for the detail-sheet stepper. */
  steps: RealFiActivityStep[];
};

/**
 * A wallet's R-Points snapshot from RealFi's points engine (launch season,
 * LW-15495), read via the partner SDK. Display-only: RealFi's engine owns
 * every calculation — Lace never derives, sums, or projects points. A wallet
 * the engine has no record of reads as 0 (a successful read, not a failure).
 */
export type RealFiRPoints = {
  /**
   * The wallet's R-Points balance as reported by RealFi: the settled engine
   * balance, falling back to RealFi's own provisional figure when no settled
   * balance exists yet (mid-season, before finalisation).
   */
  totalPoints: number;
};

/** A matured (timelock-open) unstake whose released USDr is ready to withdraw. */
export type RealFiWithdrawableUnstake = {
  /** Timelock output holding the released USDr (the claim input). */
  timelockUtxo: { txHash: string; index: number };
  /** Slot the timelock opened at — needed to rebuild it for the claim. */
  unlockSlot: number;
  /**
   * Released USDr held by the timelock (base units) — what the claim tx pays,
   * read from the timelock UTxO. Falls back to the order's sUSDr deposit (a
   * lower bound: the vault rate is ≥ 1) when the UTxO value is unreadable.
   */
  usdrAmount: string;
};

/** An executed unstake still in its cooldown (timelock not yet open). */
export type RealFiCoolingDownUnstake = {
  /** Slot the cooldown ends / the timelock opens (funds become withdrawable). */
  unlockSlot: number;
  /**
   * Wall-clock (epoch ms) the timelock opens, derived era-proof from the
   * chain tip (`now + (unlockSlot − tip)` seconds), falling back to the
   * system-start approximation when the tip read fails.
   */
  claimableAtMs: number;
  /**
   * USDr locked in the cooldown timelock (base units) — fixed at execution,
   * read from the timelock UTxO. Falls back to the order's sUSDr deposit (a
   * lower bound: the vault rate is ≥ 1) when the UTxO value is unreadable.
   */
  usdrAmount: string;
};

export type RealFiStakeInputAssetsRequest = {
  /** Resolved RealFi config for the active network (from the REALFI flag payload). */
  config: RealFiNetworkConfig;
};

export type RealFiActivityRequest = {
  /** Resolved RealFi config for the active network (from the REALFI flag payload). */
  config: RealFiNetworkConfig;
  accountId: AccountId;
  /** Staker bech32 address (source of the RealFi owner hash + Sundae key). */
  userAddress: string;
};

export type RealFiWithdrawRequest = {
  /** Resolved RealFi config for the active network (from the REALFI flag payload). */
  config: RealFiNetworkConfig;
  accountId: AccountId;
  /** Staker bech32 address (timelock owner + funds destination). */
  userAddress: string;
  /** Matured timelocks to spend in a single batched claim tx. */
  unstakes: RealFiWithdrawableUnstake[];
};

// --- Partner attribution ---

/**
 * Outcome of a RealFi partner attribution claim. `duplicate` is a success:
 * the claim is idempotent per (txHash, outputIndex), so a retry that lands
 * twice is reported, not failed.
 */
export type RealFiAttributionClaim = {
  status: 'accepted' | 'duplicate';
};

export type RealFiAttributionRequest = {
  /** Resolved RealFi config for the active network (from the REALFI flag payload). */
  config: RealFiNetworkConfig;
  /** Staker bech32 address (the SDK instance's cold wallet). */
  userAddress: string;
  /** The order transaction, signed or not — only its body hash is claimed. */
  serializedTx: string;
  /** Index of the order output to attribute, from the build. */
  orderOutputIndex: number;
};

// --- Provider interface ---

export interface RealFiProvider {
  getSorQuote(
    request: RealFiSorQuoteRequest,
  ): Observable<Result<RealFiSorQuote, RealFiProviderError>>;

  buildBundledTx(
    request: RealFiBuildRequest,
  ): Observable<Result<RealFiBundledTransaction, RealFiProviderError>>;

  /** Build the unsigned cancel tx for a pending order (swap or stake leg). */
  buildCancelTx(
    request: RealFiCancelRequest,
  ): Observable<Result<RealFiBundledTransaction, RealFiProviderError>>;

  /**
   * Live APY + vault rate for the network. Takes the FLAG-RESOLVED config so
   * a CMS `realfiApiUrl` rotation reaches the yield feed like every other
   * read (previously resolved compile-time defaults and ignored overrides).
   */
  getExchangeRateAndApy(
    request: RealFiStakeInputAssetsRequest,
  ): Observable<Result<RealFiExchangeRateAndApy, RealFiProviderError>>;

  /**
   * The stake-input asset ids the Manage sheet may offer: the live curated
   * counterpart list (partner-config.json; compiled fallback), verified
   * against Sundae pool discovery so only assets a composable USDr pool can
   * fill are offered. Network I/O + the Sundae client — runs in the provider
   * (SW), never in the Metro-bundled UI (ADR-19).
   */
  getStakeInputAssets(
    request: RealFiStakeInputAssetsRequest,
  ): Observable<Result<string[], RealFiProviderError>>;

  /**
   * Wall-clock time (ms) the timelock of an unstake submitted now would open:
   * the NEXT cooldown-period end from the backend's `stakeTimes` read — a
   * batch-window boundary, not "now + cooldown length". Off-chain SDK read —
   * runs in the provider (SW), never in the Metro-bundled UI (ADR-19).
   */
  getCooldownUnlockTime(
    request: RealFiStakeInputAssetsRequest,
  ): Observable<Result<Milliseconds, RealFiProviderError>>;

  /** Staking-history rows for an account (off-chain API — runs in the SW). */
  getStakeActivities(
    request: RealFiActivityRequest,
  ): Observable<Result<RealFiStakeActivity[], RealFiProviderError>>;

  /**
   * The wallet's R-Points balance from RealFi's points engine (launch season,
   * LW-15495), via the partner SDK's off-chain client — runs in the provider
   * (SW), never in the Metro-bundled UI (ADR-19).
   */
  getRPoints(
    request: RealFiActivityRequest,
  ): Observable<Result<RealFiRPoints, RealFiProviderError>>;

  /** Matured unstakes whose released USDr is ready to withdraw/claim. */
  getWithdrawableUnstakes(
    request: RealFiActivityRequest,
  ): Observable<Result<RealFiWithdrawableUnstake[], RealFiProviderError>>;

  /** Executed unstakes still in cooldown (timelock not yet open). */
  getCoolingDownUnstakes(
    request: RealFiActivityRequest,
  ): Observable<Result<RealFiCoolingDownUnstake[], RealFiProviderError>>;

  /**
   * Claim Lace's attribution of an order output with RealFi, binding the claim
   * to the transaction body hash. MUST be awaited after the body is final and
   * before the tx is submitted — RealFi will not honour a claim for a body
   * that never reached the chain, nor one whose body changed afterwards.
   */
  claimOrderAttribution(
    request: RealFiAttributionRequest,
  ): Observable<Result<RealFiAttributionClaim, RealFiProviderError>>;

  /**
   * Build a single unsigned tx that claims every matured timelock in `unstakes`
   * (batched, one signature). Built with `@cardano-sdk` — no Blaze.
   */
  buildWithdrawTx(
    request: RealFiWithdrawRequest,
  ): Observable<Result<RealFiBundledTransaction, RealFiProviderError>>;
}

// --- Dependencies shape (augmented into SideEffectDependencies) ---

export type RealFiProviderDependencies = {
  realfiProviders: RealFiProvider[];
};
