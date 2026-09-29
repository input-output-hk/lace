import type {
  RealFiCoolingDownUnstake,
  RealFiErrorCode,
  RealFiRPoints,
  RealFiRouteLeg,
  RealFiSorQuote,
  RealFiStakeActivity,
  RealFiWithdrawableUnstake,
} from '../provider-types';
import type { RealFiSdkNetwork } from '../realfi-network-config';
import type { RealFiPositionId, RealFiStakeId } from '../value-objects';
import type { Percent } from '@cardano-sdk/util';
import type { TranslationKey } from '@lace-contract/i18n';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Milliseconds } from '@lace-lib/util';

/** Which round-trip operation a flow drives. */
export type RealFiFlowKind = 'cancel' | 'claim' | 'stake' | 'unstake';

/**
 * Live SOR review snapshot held in `ReviewingTransaction` (spec §4.4.1).
 * `quote` is the provider response; the rest are review-row projections.
 */
export type RealFiReview = {
  quote: RealFiSorQuote;
  /** Estimated output: sUSDr (stake) / ADA (unstake/claim). String, base units. */
  estimatedOutput: string;
  /** Bundled legs: ADA→stablecoin→USDr→sUSDr (or mirror). */
  route: RealFiRouteLeg[];
  /** Aggregate price impact across the route. */
  priceImpact: Percent;
  /** Network fee, lovelace base units. */
  networkFee: string;
  /** RealFi's per-order processing fee, lovelace base units. */
  processingFee: string;
  /** Service fee in `serviceFeeTokenId` base units — not summable with `networkFee`. */
  serviceFee: string;
  serviceFeeTokenId: string;
  /** Quote staleness boundary; re-quote before signing past this. */
  quoteExpiresAt: Milliseconds;
};

/**
 * Per-operation flow state machine
 * Idle → Preparing → ReviewingTransaction → SigningTransaction
 *   → SubmittingTransaction → Queued | Error
 * (spec §4.4.1; pattern: swap-context `swapFlowMachine`).
 */
export type RealFiFlowState =
  | {
      status: 'Error';
      kind: RealFiFlowKind;
      accountId: AccountId;
      /** Preserved through the failure so Try again re-quotes the same request. */
      inputAmount: string;
      inputTokenId: string;
      outputTokenId: string;
      errorMessage: TranslationKey;
      /**
       * Raw message from the failing provider/SDK call, when one existed —
       * surfaced to the user (sanitized at render) so a failed quote or build
       * says what actually went wrong, not just that something did.
       */
      errorDetail?: string;
      /**
       * Provider error code when the failure carried one — lets the UI pick
       * state-specific messaging (compliance-gate refusals foremost) without
       * parsing message text.
       */
      errorCode?: RealFiErrorCode;
      previousStatus:
        | 'Preparing'
        | 'ReviewingTransaction'
        | 'SigningTransaction'
        | 'SubmittingTransaction';
    }
  | {
      status: 'Preparing';
      kind: RealFiFlowKind;
      accountId: AccountId;
      /** ADA (stake) / sUSDr (unstake), base units. */
      inputAmount: string;
      /** Wallet token id of the swap input (`lovelace` / `<policyId><nameHex>`). */
      inputTokenId: string;
      /** Desired output token id (unstake only); USDr ⇒ no swap. */
      outputTokenId: string;
    }
  | {
      status: 'Queued';
      kind: RealFiFlowKind;
      accountId: AccountId;
      txId: string;
      stakeId: RealFiStakeId;
      /**
       * What actually funded the queued transaction. Carried through from
       * SubmittingTransaction so post-queue surfaces (the first-swap bonus
       * pill) can tell a swap-into-USDr from a direct USDr stake without
       * re-reading the Manage sheet's mutable token selection.
       */
      inputTokenId: string;
    }
  | {
      status: 'ReviewingTransaction';
      kind: RealFiFlowKind;
      accountId: AccountId;
      inputAmount: string;
      inputTokenId: string;
      outputTokenId: string;
      review: RealFiReview;
    }
  | {
      status: 'SigningTransaction';
      kind: RealFiFlowKind;
      accountId: AccountId;
      inputAmount: string;
      inputTokenId: string;
      outputTokenId: string;
      review: RealFiReview;
      unsignedTxCbor: string;
    }
  | {
      status: 'SubmittingTransaction';
      kind: RealFiFlowKind;
      accountId: AccountId;
      inputAmount: string;
      inputTokenId: string;
      outputTokenId: string;
      review: RealFiReview;
      /** Unsigned order CBOR; signed in the finalize arm before submit. */
      serializedTx: string;
      /**
       * Index of the order output to attribute to Lace, from the build.
       * Absent when the build places no claimable order (unstake).
       */
      orderOutputIndex?: number;
    }
  | { status: 'Idle' };

/** A warmup (pending stake) or cooldown (pending unstake) entry. */
export type RealFiPendingOperation = {
  stakeId: RealFiStakeId;
  kind: Extract<RealFiFlowKind, 'stake' | 'unstake'>;
  /** USDr principal locked (warmup) / on cooldown. Base units. */
  principalUsdr: string;
  startedAt: Milliseconds;
  /** Warmup/cooldown completion (≈7 days; spec Global constraints / A8). */
  availableAt: Milliseconds;
};

/** Per-account position snapshot (spec §4.4.2). */
export type RealFiPosition = {
  positionId: RealFiPositionId;
  accountId: AccountId;
  /** Receipt held while earning. Base units sUSDr. */
  stakedSusdr: string;
  /** USDr available to stake (off-vault). Base units. */
  availableUsdr: string;
  pendingStake?: RealFiPendingOperation;
  pendingUnstake?: RealFiPendingOperation;
  /** Post-cooldown, claimable to ADA (spec Q1). Base units. */
  claimableAda?: string;
  lastSuccessfulSync?: Milliseconds;
};

/** Cached yield display (spec §4.4.2). */
export type RealFiYieldInfo = {
  /**
   * APY shown on Staking Center card + detail; `undefined` until the network's
   * annualization feed has ever resolved (the UIs show no yield instead). The
   * reducer keeps a previously-known APY when a refresh arrives without one.
   */
  apy?: Percent;
  /** "1 USDr = 1 sUSDr" staking leg; live for swap legs. */
  exchangeRate: number;
  fetchedAt: Milliseconds;
};

export type RealFiFlowSliceState = RealFiFlowState;

export type RealFiPositionSliceState = {
  positionsByAccount: Record<AccountId, RealFiPosition>;
  /**
   * Cached yield display per RealFi network, persisted so the detail screen
   * renders the last-known rate instantly instead of flickering through a 1:1
   * default on every visit. Keyed by network: each deployment's vault rate and
   * APY differ, and the active network can switch without a store reset.
   */
  yieldInfoByNetwork: Partial<Record<RealFiSdkNetwork, RealFiYieldInfo>>;
  /**
   * First-ever observed sUSDr→USDr rate per network — the Total Earned cost
   * basis (LW-14651): earned = staked sUSDr × (current − basis). Persisted so
   * the basis survives reloads; an approximation until a per-lot cost basis
   * (from order history) replaces it.
   */
  earnBasisRateByNetwork: Partial<Record<RealFiSdkNetwork, number>>;
  /**
   * Stake-input asset ids (Sundae dotted form) the Manage sheet may offer,
   * per network: the live curated counterpart list verified against Sundae
   * pool discovery. Fetched by the provider (SW — ADR-19); the compiled
   * `swapCounterpartAssets` copy serves until this resolves. Not persisted.
   */
  stakeInputAssetsByNetwork: Partial<Record<RealFiSdkNetwork, string[]>>;
  /**
   * Wall-clock time (ms) the next cooldown period ends, per network — the
   * unlock an unstake submitted now would carry. Drives the Manage sheet's
   * Cooldown Period row; the static nominal copy serves until this resolves
   * (or once a cached boundary has already passed).
   */
  cooldownUnlockAtMsByNetwork: Partial<Record<RealFiSdkNetwork, number>>;
  /**
   * Staking-history rows per account (from the off-chain API side-effect).
   * Persisted so the Staking Activities list rehydrates on return instead of
   * flashing empty; the on-mount read replaces it with the fresh history.
   */
  stakeActivitiesByAccount: Record<AccountId, RealFiStakeActivity[]>;
  /**
   * The token the user picked to stake, set by the select-token sheet and read
   * by Manage Stake (mirrors the swap flow's token selection). Transient — not
   * persisted; Manage Stake defaults to ADA when unset.
   */
  selectedStakeInputTokenId?: string;
  /**
   * Completed-withdrawal history rows per account, recorded optimistically when
   * a claim is signed. Kept separate from (and merged into) `stakeActivitiesByAccount`
   * because the off-chain API stops returning a claimed unstake as an Executed
   * order once its timelock is spent, so a claim can't be re-derived from a read.
   * Persisted (see store/init.ts) so the row survives reloads.
   */
  withdrawnActivitiesByAccount: Record<AccountId, RealFiStakeActivity[]>;
  /** Withdraw-ready (matured) unstakes per account. */
  withdrawableByAccount: Record<AccountId, RealFiWithdrawableUnstake[]>;
  /**
   * The last failed claim, held for the error sheet: Try again re-dispatches
   * this exact request. Transient — cleared on retry/dismiss, not persisted.
   */
  withdrawFailure?: {
    accountId: AccountId;
    unstakes: RealFiWithdrawableUnstake[];
  };
  /**
   * The last successful claim, held for the claim sheet's "Claim completed"
   * success state (LW-14684). Transient — cleared on dismiss/new request.
   */
  /**
   * True while a claim is being built/signed/submitted. Store-derived (not
   * component state) so the error sheet's Try again re-dispatch disables the
   * claim CTA too — a second tap would build a duplicate claim over the same
   * timelock UTxOs ("inputs already spent"). Transient — not persisted.
   */
  withdrawInFlight?: boolean;
  withdrawSuccess?: {
    accountId: AccountId;
    /** Claimed USDr, base units. */
    amountUsdr: string;
  };
  /**
   * The claim sheet's dry-run quote: the built tx's exact ledger fee AND the
   * built CBOR, keyed by the timelock set it spends — confirm signs the very
   * tx whose fee was displayed instead of rebuilding it (a rebuild re-reads
   * every timelock UTxO and can price a different fee than the one the user
   * approved). Transient — cleared on each new quote request.
   */
  withdrawFeeQuote?: {
    feeLovelace: string;
    unsignedTxCbor: string;
    /** Canonical sorted `txHash#index` join of the quoted timelock set. */
    timelockKey: string;
    /** Epoch ms the quote was built — reuse is freshness-bounded. */
    quotedAt: number;
  };
  /** Unstakes still in cooldown (not yet withdrawable) per account. */
  coolingDownByAccount: Record<AccountId, RealFiCoolingDownUnstake[]>;
  /**
   * Timelocks whose claim tx was just submitted, keyed `txHash#index` per
   * account with the submit time. The withdraw-ready read keeps returning a
   * claimed timelock as unspent until the claim tx confirms (mempool window),
   * which would resurrect the Rewards Available banner right after claiming —
   * `withdrawableReceived` suppresses these entries instead. A tombstone is
   * dropped once a read no longer returns its timelock (the backend caught
   * up) or after a safety window, so a claim whose tx never lands resurfaces
   * and can be retried. Transient — not persisted, cleared on network switch.
   */
  claimedTimelocksByAccount: Record<
    AccountId,
    { key: string; clearedAtMs: number }[]
  >;
  /**
   * Order txs Lace submitted whose order the RealFi feed has not returned yet
   * (under any status). An entry clears when the feed catches up; one still
   * here past the grace period, for a tx confirmed on-chain, means the feed
   * is missing data the chain has — the USDr detail's feed-mismatch warning.
   * Persisted: the mismatch must survive a restart, since the outage it
   * detects outlives the session.
   */
  submittedOrderTxsByAccount: Record<AccountId, RealFiSubmittedOrderTx[]>;
  /**
   * Whether the "How it Works" onboarding carousel has been shown. Set on the
   * first visit to the USDr staking center and persisted, so the carousel
   * appears exactly once per wallet installation.
   */
  hasSeenOnboarding: boolean;
  /**
   * R-Points snapshot per account (launch season, LW-15495). Persisted so the
   * card renders the cached balance instantly while `makeRPoints` refetches —
   * on every screen focus and on each queued stake/unstake — and a failed
   * read keeps the previous snapshot: the points read must never block or
   * delay the staking screen.
   */
  rPointsByAccount: Record<AccountId, RealFiRPoints>;
  /**
   * Outcome of each account's latest R-Points read this session (LW-15494):
   * with failed reads keeping the previous snapshot, the snapshot alone cannot
   * say whether the card shows fresh or stale data — the `api_status` on the
   * card-impression analytics event needs this. Transient — not persisted,
   * cleared on network switch.
   */
  rPointsFetchStatusByAccount: Record<AccountId, 'failure' | 'success'>;
  /**
   * Accounts whose one-time Lace acquisition bonus was consumed locally (their
   * first qualifying swap into USDr was queued). RealFi's SDK exposes no
   * bonus-used flag, so availability derives from the engine's own order
   * history (`selectIsLaceSwapBonusAvailableByAccountId`); this flag covers
   * the indexing window between queueing that first swap and the history read
   * returning it. Persisted — the window can span a restart.
   */
  laceBonusConsumedByAccount: Record<AccountId, boolean>;
};

/** A stake/unstake order tx awaiting its appearance in the RealFi order feed. */
export type RealFiSubmittedOrderTx = {
  txHash: string;
  /** Wall-clock ms the submit succeeded. */
  recordedAt: number;
  kind: 'stake' | 'unstake';
  /**
   * Wallet token id of the flow's input. Only DIRECT orders can be matched to
   * the feed by txHash (any unstake, or a USDr-input stake) — a swap-routed
   * stake's tx creates a Sundae order under a different id, so consumers use
   * this to skip those rather than false-positive.
   */
  inputTokenId: string;
};
