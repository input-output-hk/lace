import { Serializable } from '@lace-lib/util-store';
import { createSlice } from '@reduxjs/toolkit';

import type { ReviewedSweepPlan } from './side-effects/create-source-context';
import type { TranslationKey } from '@lace-contract/i18n';
import type {
  AccountId,
  AnyAccount,
  WalletId,
} from '@lace-contract/wallet-repo';
import type {
  DerivationType,
  DeviceDescriptor,
  HardwareErrorCategory,
  HardwareIntegrationId,
} from '@lace-lib/util-hw';
import type { BlockchainName } from '@lace-lib/util-store';
import type { PayloadAction } from '@reduxjs/toolkit';

// Borrowed off the account shape instead of importing @lace-contract/network,
// which this module has no other reason to depend on.
type SourceNetworkType = AnyAccount['networkType'];

/**
 * Linear wizard state machine. The destination wallet is created FIRST so the
 * app-lock password ceremony lands on the keeper wallet (app-lock setup is
 * first-run-only and installation-wide); the source is then imported as a
 * second wallet that reuses that app-lock. Creating the destination up front
 * also shrinks the compromise-race window (spec NFR-2 / OQ-B): the seed is
 * only entered once everything downstream is ready.
 *
 * The destination phrase is generated, backed up, and verified INSIDE the
 * wizard (backupPhrase → verifyPhrase) before the wallet is created — like
 * the platform's own onboarding, and unlike the standalone verification
 * sheet, which must decrypt an already-persisted wallet and therefore
 * re-prompts for the password. Creation goes through the recovery path with
 * the pre-verified phrase, so the wallet is born isPassphraseConfirmed
 * (SR-10: verification is structurally unskippable — creation is gated on
 * re-entering the phrase, and the sweep only ever targets that wallet).
 *
 *   idle → intro → chooseDestination → [connectDevice] → [createDestination]
 *     → [backupPhrase ⇄ verifyPhrase] → creatingDestination → enterSeed
 *     → importingSource → discovering → review → sweeping → delegating → done
 *
 * Bracketed steps are path-dependent; `wizard-progress.ts` derives the same
 * paths to number them. `stepBack` reverses the arrows up to
 * `createDestination` — past that a wallet exists and there is nothing to
 * return to.
 *
 * Any step may transition to `failed` or back to `idle` (abandon). Only a
 * `sweeping` failure is retryable; a failure from any other step falls back to
 * cancel.
 */
export type MigrateWalletStep =
  | 'backupPhrase'
  | 'chooseDestination'
  | 'chooseLoadedSource'
  | 'chooseMode'
  | 'choosePool'
  | 'chooseSource'
  | 'connectDestinationDevice'
  | 'connectDevice'
  | 'connectSourceDevice'
  | 'createDestination'
  | 'creatingDestination'
  | 'delegating'
  | 'delegationPaused'
  | 'discovering'
  | 'done'
  | 'enterSeed'
  | 'failed'
  | 'idle'
  | 'importingSource'
  | 'intro'
  | 'review'
  | 'sweeping'
  | 'sweepPaused'
  | 'unsupported'
  | 'verifyPhrase';

export type DestinationType = 'existing' | 'fresh' | 'hardware';

/**
 * The user's pool pick, as the wizard stores and displays it. Deliberately a
 * display-fields subset of the picker's `PoolSelection` — the wizard needs the
 * id to delegate and the ticker/rate to state the choice on the review,
 * nothing more.
 */
export type ChosenPool = {
  poolId: string;
  ticker: string | null;
  ros?: number;
};

export type SourceType = 'hardware' | 'loaded' | 'phrase';

/** Where choosing a source type sends the user to supply it. */
const STEP_FOR_SOURCE_TYPE: Record<SourceType, MigrateWalletStep> = {
  hardware: 'connectSourceDevice',
  loaded: 'chooseLoadedSource',
  phrase: 'enterSeed',
};

/** Which surface opened the wizard — analytics-only, never stored. The flow is
 * identical from all four; they are kept apart so the funnel can tell which
 * door users actually come through. */
export type WizardOpenOrigin =
  | 'add-wallet'
  | 'onboarding'
  | 'restore'
  | 'settings'
  | 'wallet-settings';

/**
 * One non-ADA asset a sweep moves: `policyId + assetNameHex`, and the total
 * quantity of it across every swept account. Serializable, so the quantity is a
 * decimal string for the same reason the lovelace fields are.
 */
export type SweptAsset = { id: string; quantity: string };

/**
 * Aggregated, non-secret result of source-wallet asset discovery (FR-3).
 * Amounts are lovelace encoded as decimal strings (serializable).
 */
export type DiscoverySummary = {
  utxoCount: number;
  totalCoin: string;
  // The non-ADA assets the sweep moves. Ids and amounts, not a count — the
  // review screen lists them, and the count it shows is this array's length, so
  // there is one fewer field to keep in step.
  assets: SweptAsset[];
  withdrawableRewards: string;
  // Lovelace the sweep leaves on the source: one stake-key deposit per
  // registered account, at the parameter in force when discovery ran. A figure
  // rather than a flag because the screens state the amount, and a flag left
  // them asserting one deposit for a source that may hold several.
  retainedStakeDeposit: string;
  estimatedFee: string;
  // Multi-account coverage for the success screen's scoped-claim disclosure.
  // sweptAccountCount is how many accounts (index 0 plus the scanned actives) the
  // sweep moves. scannedThroughAccountIndex is the highest index the scan probed,
  // so funds on accounts past it are disclosed as not swept, never implied moved.
  sweptAccountCount: number;
  scannedThroughAccountIndex: number;
  // Scanned UTxOs the sweep cannot move because their payment credential is a
  // script. Disclosed on the review screen before the irreversible sweep, since
  // this is the one unspendable shape no pre-submit guard rejects. Carries no
  // ownership claim (anyone can pair a script hash with a stake credential) and
  // no completeness claim (only positions that kept the stake credential are
  // visible). Spans the source account and every scanned account.
  scriptUtxoCount: number;
  // How many transactions the sweep will be split into (FR-6). 1 for a
  // single-tx sweep, >1 when the UTxO set exceeds maxTxSize.
  chunkCount: number;
  /**
   * What preserve mode would cost instead: one transaction per funded source
   * account, each paying its own fee. Present only for multi-account sources
   * — the review swaps its fee and transaction-count figures to these when
   * the user chooses to preserve.
   */
  preserveEstimatedFee?: string;
  preserveTxCount?: number;
  /**
   * Rewards that actually arrive under preserve mode: only those belonging to
   * accounts it migrates. A rewards-only account is refused (its withdrawal
   * elsewhere would link accounts), so counting the discovery-wide total would
   * promise rewards that stay on the source.
   */
  preserveWithdrawableRewards?: string;
  /**
   * SOURCE account indexes whose funds arrive under preserve mode but cannot
   * cover their own stake-key deposit and delegation fee. They are migrated —
   * the funds move — but arrive without rewards set up, and the review says
   * so rather than letting the delegation discover it and pause.
   */
  preserveUnfundedSetupAccounts?: number[];
};

/**
 * An empty source has no input to spend, so a single-tx sweep can never build.
 * Both the review screen (a close action) and sweepStarted gate on this, so the
 * flow cannot dead-end at an unbuildable sweep the balancer would reject.
 */
export const discoveryHasNothingToSweep = (
  discovery: DiscoverySummary,
): boolean =>
  discovery.utxoCount === 0 &&
  discovery.withdrawableRewards === '0' &&
  discovery.retainedStakeDeposit === '0';

/** The roles the user self-declares on the review screen. */
export type AttestedRoles = {
  pool: boolean;
  drep: boolean;
  proposer: boolean;
};

/**
 * Any attested role refuses the sweep, so this is a disjunction: one role is
 * enough. Extracted from the review screen because the review control's choice
 * between refusing and sweeping turns on it.
 */
export const hasNonMigratableRole = (roles: AttestedRoles): boolean =>
  roles.pool || roles.drep || roles.proposer;

/**
 * Hardware device params stashed while the onboarding-path user enters a
 * password. Persisted in Redux (not component state) so a popup remount
 * mid-flow does not lose them — the extension popup closes whenever a HW
 * integration window (USB picker, Trezor Connect) steals focus.
 */
/**
 * The per-category device guidance a screen can show: what to do about this
 * device, alongside the step's own message. Shown while importing a source (the
 * device is being waited on) and on a failure a device raised (the failure key
 * says the sweep stopped; this says the app is not open).
 */
export type DeviceWaitHintKey = `hw-error.${HardwareErrorCategory}.subtitle`;

export type PendingHwDestination = {
  optionId: HardwareIntegrationId;
  device?: DeviceDescriptor;
  blockchainName: BlockchainName;
  derivationType?: DerivationType;
  /** Carried so a side-effect retry can re-dispatch creation verbatim — the
   * localized name is only resolvable where the original dispatch ran. */
  walletName?: string;
};

export type SweepProgress = {
  totalChunks: number;
  submittedChunks: {
    index: number;
    txId: string;
    /**
     * Which source account paid this transaction and which destination account
     * it credited. Present for a per-account (preserve) sweep only; a
     * consolidated sweep has one destination for every chunk. The migration
     * report states these against the tx ids so the mapping is auditable
     * on-chain.
     */
    sourceAccountIndex?: number;
    destinationAccountIndex?: number;
    destinationAddress?: string;
  }[];
};

/**
 * How the destination's delegation ended. The done screen reads this rather
 * than inferring from a txId, because "no transaction" covers three unrelated
 * endings and only one of them is a shortfall the user can act on:
 *
 * - `delegated` — certificates submitted. `poolId` is present only when this
 *   transaction also moved stake; a destination that already staked keeps its
 *   own pool and delegates the vote alone.
 * - `already-delegated` — the destination's voting power already points at the
 *   PROMOTED DRep, so the condition of use was already met. Any other vote
 *   delegation (third-party DRep, abstain sentinel) is re-pointed, not
 *   respected as done.
 * - `unavailable` — no promoted pool + DRep configured for the active network,
 *   so there was nothing to delegate to. A configuration state, not a failure:
 *   the recovery action would lead to the same empty target.
 * - `undelegated` — attempted and abandoned. The only outcome the done screen
 *   warns about, and the only one offering recovery.
 */
/** Mirrors the earn-rewards flow's own failure phases, which is where these
 * come from — the wizard drives that flow rather than rebuilding it. */
export type DelegationFailurePhase =
  | 'fee-calculation'
  | 'signing'
  | 'submission';

/** The running delegation's stage, as far as the waiting screen tells them apart. */
export type DelegationPhase = 'confirming' | 'finishing' | 'settling';

/**
 * Consolidate: everything lands in one destination account (one transaction
 * set, co-spending every source account). Preserve: one transaction per
 * source account into its own destination account, so the source's account
 * structure survives and the transactions never link the accounts on-chain.
 */
export type MigrationMode = 'consolidate' | 'preserve';

/**
 * One row of the migration plan: which source account funds which destination
 * account, with the figures the mapping row states. Destination indices are
 * PLANNED — for an existing destination wallet they are the next fresh
 * accounts, created only when the sweep actually starts.
 */
export type AccountMappingEntry = {
  sourceAccountIndex: number;
  destinationAccountIndex: number;
  /** Lovelace moved from this source account, as a decimal string. */
  coin: string;
  assetCount: number;
  utxoCount: number;
  /**
   * Whether this account's own UTxOs can fund its own transaction, its reward
   * withdrawal included — the rule that decides whether preserve mode migrates
   * it. Set by discovery from a per-account dry build; absent on a mapping from
   * an older run, where {@link isMigratableRow} falls back to the UTxO proxy.
   */
  canFundOwnTransaction?: boolean;
  /**
   * The pool this SOURCE account currently delegates to, when it does. Carried
   * so preserve mode can leave each account staking where the user put it
   * rather than moving every one of them to a single pool.
   *
   * Absent on a mapping from an older run, and absent for an account that does
   * not stake — both mean "nothing to preserve", and the target or chosen pool
   * applies instead.
   */
  sourcePoolId?: string;
};
export type AccountMapping = AccountMappingEntry[];

/**
 * Whether preserve mode migrates this account: its own UTxOs must cover its own
 * transaction, withdrawal included. Rewards do not qualify an account — they
 * cannot pay a fee — and neither does a registered stake key's deposit.
 *
 * One predicate for every consumer, so the review, the sweep and the report
 * cannot disagree about which accounts move.
 */
export const isMigratableRow = (row: AccountMappingEntry): boolean =>
  row.canFundOwnTransaction ?? row.utxoCount > 0;

export type DelegationOutcome =
  | { status: 'already-delegated' }
  | { status: 'delegated'; txId: string; drepId?: string; poolId?: string }
  | { status: 'unavailable' }
  | { status: 'undelegated' };

/**
 * One submitted rewards set-up transaction, and the destination account it set
 * up.
 *
 * Recorded per account because the set-up is per account: a preserved migration
 * into three destinations submits three of these. `DelegationOutcome` carries
 * only the last one — enough to report "delegated", not enough to check the
 * other two landed, which is what the migration report is for.
 */
export type DelegationSubmission = {
  txId: string;
  destinationAccountIndex?: number;
};

export type MigrateWalletState = {
  step: MigrateWalletStep;
  destinationType?: DestinationType;
  pendingHwDestination?: PendingHwDestination;
  destinationWalletId?: WalletId;
  destinationAccountId?: AccountId;
  /**
   * Device params of a hardware SOURCE, kept from import through discovery:
   * the account scan exports xpubs for accounts 1+ from this device, so the
   * descriptor must survive popup remounts exactly like the destination's.
   */
  pendingHwSource?: PendingHwDestination;
  /**
   * What to do about a device state (locked, app closed, unplugged) that is
   * holding up the step on screen: while the source import is being
   * re-attempted, and on a failure a device raised, where the failure key says
   * only that the step stopped.
   *
   * Deliberately the narrow hw-error union, not TranslationKey: a second
   * full-union field pushes the module's inferred declaration past the
   * compiler's serialization limit (TS7056).
   */
  deviceWaitHintKey?: DeviceWaitHintKey;
  sourceWalletId?: WalletId;
  sourceAccountId?: AccountId;
  /**
   * The source account's own network (mainnet vs testnet), carried alongside
   * its ids so the review and refusal screens can label amounts with the
   * right ticker without a live store lookup that could resolve to a
   * different account, or none at all.
   */
  sourceNetworkType?: SourceNetworkType;
  discovery?: DiscoverySummary;
  /**
   * The exact reviewed swept set (a {@link ReviewedSweepPlan}) encoded via
   * `Serializable.to`, replayed verbatim by the sweep so it spends only the
   * reviewed accounts and never re-scans (a second scan could diverge). Stored
   * `unknown`: the encoded blob's phantom `Serializable` brand cannot be named in
   * this module's inferred exports (TS4023/TS7056), and it is decoded back to a
   * typed plan at the selector boundary.
   */
  reviewedSweepPlan?: unknown;
  sweepTxId?: string;
  /**
   * What the sweep actually did, read off the signed body at success. The done
   * screen showed the review's forecast, so rewards withdrawn elsewhere on the
   * same seed between review and sweep left the user told that rewards arrived
   * which never did. Strings, because bigint is not serialisable into redux.
   */
  sweptFee?: string;
  sweptRewards?: string;
  sweepProgress?: SweepProgress;
  /**
   * How the accounts move: consolidated into one, or preserved one-to-one.
   * Chosen on `chooseMode` for multi-account sources; implied `consolidate`
   * when there is only one account (the modes are then identical).
   */
  migrationMode?: MigrationMode;
  /** The planned source→destination account rows, present once discovered. */
  accountMapping?: AccountMapping;
  /**
   * Whether the wizard must ask the user to choose a stake pool before the
   * review: a delegation target exists (the set-up is a stated part of the
   * flow) but no promoted pool is configured, so there is nothing to assign
   * automatically (LW-15293). Computed once at discovery, like the device
   * need, so the three routes into the review agree.
   */
  needsPoolChoice?: boolean;
  /**
   * The stake pool the user chose for the rewards set-up. Display fields ride
   * along so the review can state the choice without re-fetching. Absent with
   * `needsPoolChoice` set means the user DECLINED — the sweep still runs, the
   * delegation leg is skipped, and `done` reports rewards not set up.
   */
  chosenPool?: ChosenPool;
  /**
   * The destination account indexes the freshness probe settled on, in plan
   * order. Set for a hardware destination, where the probe runs after the
   * device connects rather than at discovery (it needs the device's keys).
   * The sweep reuses these instead of probing again, which would repeat a
   * device round-trip per account — and a confirmation each, for a device in
   * expert mode — for an answer already established.
   */
  resolvedDestinationIndexes?: number[];
  /**
   * Whether the mode choice was offered. False for a single-account source (the
   * modes build the identical transaction set) or a destination that cannot
   * create accounts at all. Recorded because the device step can be entered
   * from either the mode choice or straight from discovery, and only the first
   * has a step behind it to go back to.
   */
  wasModeOffered?: boolean;
  /**
   * A loaded wallet chosen as the source BEFORE the wizard opened (the
   * per-wallet "migrate this wallet" entry). The source chooser consumes and
   * clears it.
   */
  pendingSourceWalletId?: WalletId;
  /**
   * The destination device, captured when preserve mode needs accounts a
   * hardware wallet can only export on-device (one approval per account).
   */
  pendingHwDestinationDevice?: PendingHwDestination;
  /** The landing accounts the sweep actually created/resolved, in row order. */
  preparedDestinationAccounts?: {
    destinationAccountIndex: number;
    accountId: AccountId;
  }[];
  /**
   * Where the running delegation actually is, driving the waiting screen's
   * one-line status. `settling` — the swept funds have not landed yet, there
   * is nothing for the user to do; `confirming` — the signing prompt is up
   * and waiting on the user; `finishing` — signed, submitting and wrapping
   * up. One line at a time: telling the user to confirm a prompt that does
   * not exist yet reads as a hang.
   */
  delegationPhase?: DelegationPhase;
  /** Progress through the per-account delegations, when there is more than one. */
  delegationAccountNumber?: number;
  delegationAccountCount?: number;
  /**
   * How the post-sweep delegation ended. Absent while `delegating` is still
   * running — the done screen is only ever reached with this set.
   */
  delegationOutcome?: DelegationOutcome;
  /**
   * Every rewards set-up transaction submitted, in submission order, so the
   * migration report can state all of them. A retry after a submission that
   * landed appends a second entry for that account, which is the truth: two
   * transactions were submitted.
   */
  delegationSubmissions?: DelegationSubmission[];
  /**
   * Which stage of the delegation last failed — estimating, signing, or
   * submitting. The three fail for unrelated reasons (funds, a dismissed
   * device prompt, a rejecting node), and without the distinction an
   * undelegated finish is one undiagnosable number.
   */
  delegationFailurePhase?: DelegationFailurePhase;
  errorKey?: TranslationKey;
  /** The step that failed, so retry can resume from the right place. */
  failedStep?: MigrateWalletStep;
  /**
   * Amount a permanent refusal could not move, shown on the `unsupported`
   * screen. The label travels with the value so a refusal can never render an
   * amount under the wrong label (e.g. a stranded deposit shown as "rewards").
   * `value` is a lovelace decimal string.
   */
  unsupportedAmount?: { value: string; labelKey: TranslationKey };
};

/**
 * Which screen follows once the account questions are settled, in the order the
 * wizard has to ask them: a hardware destination that must create an account
 * gives up its device first, because the freshness probe needs those keys before
 * the review can promise a landing account (FR-13); the pool choice comes last,
 * so the user picks a pool only when everything that could still abandon the
 * flow has passed.
 *
 * Stated once, here, because two transitions reach it — after discovery and
 * after the mode choice — and an order that disagreed between them would send
 * the user to a review built on unchecked indexes.
 */
/**
 * Whether the user still has a pool to choose, given what their accounts
 * already do.
 *
 * Preserve mode leaves every account staking where the user put it, so a plan
 * whose migrating accounts are all delegated has nothing left to ask: the vote
 * delegation still rides along, and asking for a pool that would then be
 * ignored is worse than not asking.
 *
 * Consolidate merges the accounts, and with them any number of different pools,
 * so there is no delegation to carry over — the choice stands.
 */
export const hasPoolLeftToChoose = ({
  accountMapping,
  migrationMode,
  needsPoolChoice,
}: Pick<
  MigrateWalletState,
  'accountMapping' | 'migrationMode' | 'needsPoolChoice'
>): boolean => {
  if (needsPoolChoice !== true) return false;
  if (migrationMode !== 'preserve') return true;
  // No plan yet: conservatively ask. A PLANNED preserve run with zero
  // migratable rows creates no landing accounts, so a collected pool would be
  // consumed by nothing — the exact asked-then-ignored case this guard exists
  // to prevent.
  if (accountMapping === undefined) return true;
  return accountMapping
    .filter(isMigratableRow)
    .some(row => row.sourcePoolId === undefined);
};

const stepAfterAccountQuestions = ({
  needsDestinationDevice,
  needsPoolChoice,
}: {
  needsDestinationDevice?: boolean;
  needsPoolChoice?: boolean;
}): MigrateWalletStep => {
  if (needsDestinationDevice === true) return 'connectDestinationDevice';
  if (needsPoolChoice === true) return 'choosePool';
  return 'review';
};

const initialState: MigrateWalletState = {
  step: 'idle',
};

const slice = createSlice({
  name: 'migrateWallet',
  initialState,
  reducers: {
    // The origin rides the action for analytics only — state does not keep it.
    // A pre-selected source (the per-wallet "migrate this wallet" entry) IS
    // kept: the source chooser resolves and skips itself when it comes up.
    wizardOpened: {
      reducer: (
        _state,
        { payload }: PayloadAction<{ sourceWalletId?: WalletId }>,
      ) => ({
        ...initialState,
        step: 'intro' as const,
        pendingSourceWalletId: payload.sourceWalletId,
      }),
      prepare: (payload?: {
        origin?: WizardOpenOrigin;
        sourceWalletId?: WalletId;
      }) => ({
        payload: payload ?? {},
      }),
    },
    // `userInitiated` tells a cancel the user pressed apart from the teardown
    // reuse in exitToWallet's finish exits — the navigate-home-on-cancel side
    // effect must only react to the former. The reducer resets either way.
    wizardCancelled: {
      reducer: () => initialState,
      prepare: (payload?: { userInitiated?: boolean }) => ({
        payload: payload ?? {},
      }),
    },
    introAcknowledged: state => {
      state.step = 'chooseDestination';
    },
    destinationTypeChosen: (
      state,
      { payload }: PayloadAction<{ type: DestinationType }>,
    ) => {
      if (state.step !== 'chooseDestination') return;
      state.destinationType = payload.type;
      if (payload.type === 'fresh') {
        state.step = 'createDestination';
      } else if (payload.type === 'hardware') {
        state.step = 'connectDevice';
      }
      // 'existing' stays at 'chooseDestination' — the UI shows the wallet picker.
    },
    existingWalletSelected: (
      state,
      {
        payload,
      }: PayloadAction<{
        destinationWalletId: WalletId;
        destinationAccountId: AccountId;
      }>,
    ) => {
      if (
        state.step !== 'chooseDestination' ||
        state.destinationType !== 'existing'
      )
        return;
      state.step = 'chooseSource';
      state.destinationWalletId = payload.destinationWalletId;
      state.destinationAccountId = payload.destinationAccountId;
    },
    hwDeviceConnected: (
      state,
      {
        payload,
      }: PayloadAction<{
        needsPassword: boolean;
        hwDestination?: PendingHwDestination;
      }>,
    ) => {
      if (state.step !== 'connectDevice') return;
      state.step = payload.needsPassword
        ? 'createDestination'
        : 'creatingDestination';
      state.pendingHwDestination = payload.hwDestination;
    },
    // The password and the generated phrase never appear in these action
    // payloads or in state — they live in the wizard component until handed
    // to onboardingV2.attemptCreateWallet in one dispatch.
    passwordChosen: state => {
      state.step = 'backupPhrase';
    },
    backupAcknowledged: state => {
      state.step = 'verifyPhrase';
    },
    /**
     * "Back" from verification to re-view the phrase. Guarded like the async
     * forward transitions: ungated it rewinds from `creatingDestination`, and
     * returning releases the double-submit latch, re-arming the second
     * `attemptCreateWallet` the latch exists to prevent. The UI disables Back
     * in flight too; this is the half that cannot be bypassed from outside.
     */
    backupRevisited: state => {
      if (state.step !== 'verifyPhrase') return;
      state.step = 'backupPhrase';
    },
    /**
     * Returns to the previous step. Only steps before the destination wallet
     * exists are reversible — past that a wallet is persisted and there is
     * nothing to restore, so those screens offer cancel. Irreversible steps
     * no-op rather than guess. `destinationType` clears wherever the user
     * returns to the choice that set it; leaving it set renders the picker
     * instead of the option list.
     */
    stepBack: state => {
      // Branches, not a switch: only five of fifteen steps are reversible, and
      // listing the other ten for exhaustiveness would bury that.
      if (state.step === 'chooseDestination') {
        // The picker is a sub-view of this step, not a step, so back returns
        // to the option list.
        if (state.destinationType !== 'existing') state.step = 'intro';
        state.destinationType = undefined;
        return;
      }

      if (state.step === 'connectDevice' || state.step === 'backupPhrase') {
        state.step = 'chooseDestination';
        state.destinationType = undefined;
        return;
      }

      if (state.step === 'createDestination') {
        // Hardware collected a device before the password, so back returns
        // there rather than discarding the connection.
        const isHardware = state.destinationType === 'hardware';
        state.step = isHardware ? 'connectDevice' : 'chooseDestination';
        state.pendingHwDestination = undefined;
        if (!isHardware) state.destinationType = undefined;
        return;
      }

      if (
        state.step === 'enterSeed' ||
        state.step === 'connectSourceDevice' ||
        state.step === 'chooseLoadedSource'
      ) {
        state.step = 'chooseSource';
        return;
      }

      if (state.step === 'connectDestinationDevice') {
        // Reachable from the mode choice, or straight from discovery when there
        // was no choice to offer. Only the former has a step behind it —
        // reversing into a mode screen the user never saw would offer preserve
        // on a source with one account, or on a destination that cannot
        // preserve at all.
        if (!state.wasModeOffered) return;
        state.step = 'chooseMode';
        state.migrationMode = undefined;
        // The carried hint described this visit's failure; kept, it would
        // greet the next visit as a live error.
        state.deviceWaitHintKey = undefined;
        return;
      }

      if (state.step === 'choosePool') {
        // Same shape as the device step above: the mode choice is the only
        // step that can sit behind this one — the device step auto-advances
        // and cannot be re-entered, and straight-from-discovery has nothing
        // behind it.
        if (!state.wasModeOffered) return;
        state.step = 'chooseMode';
        state.migrationMode = undefined;
        return;
      }

      if (state.step === 'verifyPhrase') state.step = 'backupPhrase';
    },
    destinationCreationStarted: state => {
      state.step = 'creatingDestination';
      state.errorKey = undefined;
      state.pendingHwDestination = undefined;
    },
    // The four forward transitions below are driven by asynchronous
    // side-effects (wallet creation, import, discovery, sweep), so each guards
    // on the expected prior step: a late or stray emission — e.g. an import
    // that lands after the user cancelled, or after a surface remount reset the
    // machine — is then a harmless no-op instead of forcing the wizard forward
    // from an unrelated state. The user-driven transitions don't need this;
    // they're gated by which screen is rendered.
    destinationCreated: (
      state,
      {
        payload,
      }: PayloadAction<{
        destinationWalletId: WalletId;
        destinationAccountId: AccountId;
      }>,
    ) => {
      if (state.step !== 'creatingDestination') return;
      state.step = 'chooseSource';
      state.destinationWalletId = payload.destinationWalletId;
      state.destinationAccountId = payload.destinationAccountId;
    },
    // The old wallet's kind is a decision of its own, made on one screen —
    // phrase entry and device connection are different journeys, not a field
    // and an afterthought link. Redux-owned (not component state) because the
    // extension popup remounts whenever a HW integration window steals focus,
    // which would otherwise dump a hardware user back onto the phrase screen
    // mid-connect.
    sourceTypeChosen: (
      state,
      { payload }: PayloadAction<{ type: SourceType }>,
    ) => {
      if (state.step !== 'chooseSource') return;
      state.step = STEP_FOR_SOURCE_TYPE[payload.type];
    },
    /**
     * A source that is already loaded in Lace: no import, no phrase — the
     * wallet's encrypted root is on hand, so this goes straight to discovery.
     */
    loadedSourceChosen: (
      state,
      {
        payload,
      }: PayloadAction<{
        sourceWalletId: WalletId;
        sourceAccountId: AccountId;
        sourceNetworkType: SourceNetworkType;
      }>,
    ) => {
      // Also accepted straight from the chooser: a pre-selected source skips
      // the picker entirely.
      if (state.step !== 'chooseLoadedSource' && state.step !== 'chooseSource')
        return;
      state.step = 'discovering';
      state.pendingSourceWalletId = undefined;
      state.sourceWalletId = payload.sourceWalletId;
      state.sourceAccountId = payload.sourceAccountId;
      state.sourceNetworkType = payload.sourceNetworkType;
    },
    sourceImportStarted: (
      state,
      {
        payload,
      }: PayloadAction<{ hwSource?: PendingHwDestination } | undefined>,
    ) => {
      state.step = 'importingSource';
      state.errorKey = undefined;
      state.deviceWaitHintKey = undefined;
      // Kept through discovery: the account scan exports xpubs from this
      // device. Cleared with the rest of the state on cancel/finish.
      state.pendingHwSource = payload?.hwSource;
    },
    sourceImportDeviceWaiting: (
      state,
      { payload }: PayloadAction<{ hintKey: DeviceWaitHintKey }>,
    ) => {
      if (state.step !== 'importingSource') return;
      state.deviceWaitHintKey = payload.hintKey;
    },
    sourceImported: (
      state,
      {
        payload,
      }: PayloadAction<{
        sourceWalletId: WalletId;
        sourceAccountId: AccountId;
        sourceNetworkType: SourceNetworkType;
      }>,
    ) => {
      if (state.step !== 'importingSource') return;
      state.step = 'discovering';
      state.deviceWaitHintKey = undefined;
      state.sourceWalletId = payload.sourceWalletId;
      state.sourceAccountId = payload.sourceAccountId;
      state.sourceNetworkType = payload.sourceNetworkType;
    },
    discoveryCompleted: {
      reducer: (
        state,
        {
          payload,
        }: PayloadAction<{
          discovery: DiscoverySummary;
          reviewedPlan: unknown;
          accountMapping?: AccountMapping;
          /** False for a destination that cannot create accounts (hardware):
           * everything lands in the account the user picked. */
          supportsPreservation?: boolean;
          /** The destination must create its landing account on-device, and the
           * mode screen that would collect the device is being skipped. */
          needsDestinationDevice?: boolean;
          /** A delegation target exists but names no pool: the wizard must ask
           * the user to choose one before the review (LW-15293). */
          needsPoolChoice?: boolean;
        }>,
      ) => {
        if (state.step !== 'discovering') return;
        // Only a multi-account source has a real choice to make: for one
        // account the two modes build the identical transaction set. A
        // hardware destination is excluded too — it cannot derive fresh
        // accounts without a device ceremony per index, so it consolidates.
        // Not `destinationType !== 'hardware'`: a hardware wallet picked as an
        // EXISTING destination reports type 'existing', and offering it
        // preserve planned fresh accounts it can never derive — the sweep then
        // failed after the user had confirmed.
        const hasChoice =
          payload.accountMapping !== undefined &&
          payload.accountMapping.length > 1 &&
          payload.supportsPreservation === true;
        state.wasModeOffered = hasChoice;
        state.needsPoolChoice = payload.needsPoolChoice;
        // No choice to offer still means consolidate must land in a fresh
        // account (FR-13), so a hardware destination that has to create one
        // collects the device here — the mode screen that normally does it is
        // skipped. Without this the sweep fell back to the account the user
        // picked while the review promised a new one. The pool choice comes
        // LAST before the review, after every account question is settled.
        if (hasChoice) state.step = 'chooseMode';
        else
          state.step = stepAfterAccountQuestions({
            needsDestinationDevice: payload.needsDestinationDevice,
            // Consolidate here, so nothing is preserved and the choice stands.
            needsPoolChoice: payload.needsPoolChoice,
          });
        state.migrationMode = hasChoice ? undefined : 'consolidate';
        state.accountMapping = payload.accountMapping;
        state.discovery = payload.discovery;
        state.reviewedSweepPlan = payload.reviewedPlan;
      },
      // Encode the whole set here so the action payload stays serializable, the
      // UTxOs carry BigInt.
      prepare: ({
        discovery,
        reviewedPlan,
        accountMapping,
        supportsPreservation,
        needsDestinationDevice,
        needsPoolChoice,
      }: {
        discovery: DiscoverySummary;
        reviewedPlan: ReviewedSweepPlan;
        accountMapping?: AccountMapping;
        supportsPreservation?: boolean;
        needsDestinationDevice?: boolean;
        needsPoolChoice?: boolean;
      }) => ({
        payload: {
          discovery,
          accountMapping,
          supportsPreservation,
          needsDestinationDevice,
          needsPoolChoice,
          reviewedPlan: Serializable.to(reviewedPlan) as unknown,
        },
      }),
    },
    /**
     * Consolidate into one account, or keep the source's account structure
     * across one transaction per account. A step of its own, before the
     * review: the review renders the plan this choice produces.
     */
    migrationModeChosen: (
      state,
      {
        payload,
      }: PayloadAction<{
        mode: MigrationMode;
        /**
         * A hardware destination needs one on-device approval per account it
         * must create, so the device is collected before the review rather than
         * discovered missing mid-sweep. Set for EITHER mode: consolidate lands
         * in a fresh account too (FR-13), and gating this on preserve meant a
         * consolidate swept into the already-used account the user picked while
         * the review promised a new one.
         */
        needsDestinationDevice?: boolean;
      }>,
    ) => {
      if (state.step !== 'chooseMode') return;
      state.migrationMode = payload.mode;
      state.step = stepAfterAccountQuestions({
        needsDestinationDevice: payload.needsDestinationDevice,
        needsPoolChoice: hasPoolLeftToChoose(state),
      });
    },
    /** The destination device is connected; its xpub exports can now run. */
    /**
     * The device is connected, but the step does NOT advance yet: its account
     * keys are what the freshness probe needs, and the review must not promise
     * landing accounts before they have been checked against the chain. The
     * probe runs next and `destinationTargetsResolved` moves on.
     */
    destinationDeviceConnected: (
      state,
      { payload }: PayloadAction<{ device: PendingHwDestination }>,
    ) => {
      if (state.step !== 'connectDestinationDevice') return;
      state.pendingHwDestinationDevice = payload.device;
    },
    /**
     * The device failed the probe — locked, app closed, unplugged. Returns to
     * the connect screen carrying the guidance, which is how every other
     * hardware surface reports the same problems: the picker classifies, the
     * screen names it, and the user fixes the device and connects again.
     *
     * A terminal failure screen would be wrong here. Nothing has moved — the
     * sweep is two screens away — and the fix is on the user's desk.
     *
     * The device handle is dropped with it: it is the one that just failed, and
     * reusing a dead WebUSB transport is what answers "Invalid channel" on a
     * second attempt. Reconnecting is what opens a working one.
     */
    destinationDeviceFailed: (
      state,
      { payload }: PayloadAction<{ deviceHintKey: DeviceWaitHintKey }>,
    ) => {
      if (state.step !== 'connectDestinationDevice') return;
      state.pendingHwDestinationDevice = undefined;
      state.deviceWaitHintKey = payload.deviceHintKey;
    },
    /**
     * The probe settled which accounts the funds will land in. Carries the
     * rewritten mapping so the review names checked accounts, and the resolved
     * indexes so the sweep derives exactly those — re-probing there would spend
     * a second on-device approval per account for an answer already known.
     */
    destinationTargetsResolved: (
      state,
      {
        payload,
      }: PayloadAction<{
        accountMapping?: AccountMapping;
        resolvedDestinationIndexes: number[];
      }>,
    ) => {
      if (state.step !== 'connectDestinationDevice') return;
      if (payload.accountMapping) state.accountMapping = payload.accountMapping;
      state.resolvedDestinationIndexes = payload.resolvedDestinationIndexes;
      // The probe succeeded, so any guidance from an earlier attempt is stale.
      state.deviceWaitHintKey = undefined;
      state.step = hasPoolLeftToChoose(state) ? 'choosePool' : 'review';
    },
    /** The user picked the pool the rewards set-up will delegate to. */
    poolChosen: (state, { payload }: PayloadAction<ChosenPool>) => {
      if (state.step !== 'choosePool') return;
      state.chosenPool = payload;
      state.step = 'review';
    },
    /**
     * The user declined to choose. The migration proceeds — the sweep must
     * never be held hostage to a staking decision — with the delegation leg
     * skipped and `done` reporting rewards not set up.
     */
    poolChoiceDeclined: state => {
      if (state.step !== 'choosePool') return;
      state.chosenPool = undefined;
      state.step = 'review';
    },
    // A permanent, non-retryable refusal discovered mid-flow (e.g. rewards
    // on a stake key not vote-delegated to abstain or no-confidence, which the
    // single-tx sweep can't withdraw). Terminal like `done`, not `failed`: the
    // wizard's `unsupported` screen exits to the imported source wallet rather
    // than offering a retry that could never succeed. Accepted from `discovering`
    // (the discovery verdict) and from `sweeping`: rewards can turn ineligible
    // between review and sweep (an epoch tick), and the sweep re-checks so it
    // refuses here too rather than submit a permanently-invalid withdrawal.
    migrationUnsupported: (
      state,
      {
        payload,
      }: PayloadAction<{
        errorKey: TranslationKey;
        amount?: { value: string; labelKey: TranslationKey };
      }>,
    ) => {
      if (state.step !== 'discovering' && state.step !== 'sweeping') return;
      state.step = 'unsupported';
      state.errorKey = payload.errorKey;
      state.unsupportedAmount = payload.amount;
    },
    // The user attested on the review screen to a non-migratable role (pool
    // operator, DRep, or governance proposer). Refused like the other terminals,
    // since the on-chain role is bound to the old seed and can't move.
    attestationRefused: state => {
      if (state.step !== 'review') return;
      state.step = 'unsupported';
      state.errorKey = 'migrate-wallet.error.non-migratable-role';
      // The role refusal has no amount to disclose. Clear any stale value so the
      // unsupported screen never renders an amount under this reason.
      state.unsupportedAmount = undefined;
    },
    // Only advances from the review step, so a stray or misordered sweepStarted
    // cannot skip the review screen and its attestation gate. Also refuses an
    // empty discovery: a zero-input sweep cannot build, so proceeding would
    // dead-end at an eternally-failing retry.
    sweepStarted: state => {
      if (state.step !== 'review') return;
      if (state.discovery && discoveryHasNothingToSweep(state.discovery))
        return;
      state.step = 'sweeping';
      state.errorKey = undefined;
      state.deviceWaitHintKey = undefined;
    },
    /**
     * The user dismissed the signing prompt. Not a failed sweep either way —
     * nothing was built or submitted on this attempt — but where it returns
     * them depends on what is already on-chain.
     *
     * Nothing submitted: nothing happened at all, so back to review.
     *
     * Mid-plan (a resume after a partial pause): earlier chunks are on-chain
     * and their inputs are spent, so review would misdescribe the state. Back
     * to the paused screen the retry came from, which still offers resume and
     * cancel. No errorKey — the pause is now a cancellation, not a failure.
     * Leaving the wizard on `sweeping` here would strand it with no actions.
     */
    sweepAuthCancelled: state => {
      if (state.step !== 'sweeping') return;
      state.errorKey = undefined;
      if (!state.sweepProgress) {
        state.step = 'review';
        return;
      }
      state.failedStep = 'sweeping';
      state.step = 'sweepPaused';
    },
    sweepChunkSubmitted: (
      state,
      {
        payload,
      }: PayloadAction<{
        index: number;
        txId: string;
        totalChunks: number;
        sourceAccountIndex?: number;
        destinationAccountIndex?: number;
        destinationAddress?: string;
      }>,
    ) => {
      if (state.step !== 'sweeping') return;
      state.sweepProgress ??= {
        totalChunks: payload.totalChunks,
        submittedChunks: [],
      };
      state.sweepProgress.submittedChunks.push({
        index: payload.index,
        txId: payload.txId,
        sourceAccountIndex: payload.sourceAccountIndex,
        destinationAccountIndex: payload.destinationAccountIndex,
        destinationAddress: payload.destinationAddress,
      });
    },
    sweepPaused: (
      state,
      {
        payload,
      }: PayloadAction<{
        errorKey: TranslationKey;
        deviceHintKey?: DeviceWaitHintKey;
      }>,
    ) => {
      if (state.step !== 'sweeping') return;
      state.failedStep = state.step;
      state.step = 'sweepPaused';
      state.errorKey = payload.errorKey;
      state.deviceWaitHintKey = payload.deviceHintKey;
    },
    /**
     * Re-runs discovery after it failed. Guarded to a discovery failure, and to
     * `failed`: re-entering `discovering` from anywhere else would restart a
     * scan under a step that never asked for one. Nothing has moved when
     * discovery fails, so this replaces no state — it only re-enters the step.
     */
    discoveryRetryRequested: (
      state,
      {
        payload,
      }: PayloadAction<{
        sourceWalletId: WalletId;
        sourceAccountId: AccountId;
        sourceNetworkType: SourceNetworkType;
      }>,
    ) => {
      if (state.step !== 'failed' || state.failedStep !== 'discovering') return;
      state.step = 'discovering';
      state.errorKey = undefined;
      state.deviceWaitHintKey = undefined;
      state.failedStep = undefined;
      state.sourceWalletId = payload.sourceWalletId;
      state.sourceAccountId = payload.sourceAccountId;
      state.sourceNetworkType = payload.sourceNetworkType;
    },
    /**
     * Retry is only ever a retry of a sweep. `failed` alone is too weak a
     * predecessor: a discovery failure lands there too, and re-entering
     * `sweeping` from it would start the money-moving step with no reviewed
     * plan behind it. `sweepPaused` needs no such test — only a sweep reaches
     * it. Held here rather than in handleRetry's ternary, which is where this
     * invariant used to live alone.
     */
    sweepRetryRequested: state => {
      const isRetryableFailure =
        state.step === 'failed' && state.failedStep === 'sweeping';
      if (!isRetryableFailure && state.step !== 'sweepPaused') return;
      state.step = 'sweeping';
      state.errorKey = undefined;
      state.deviceWaitHintKey = undefined;
    },
    sweepSucceeded: (
      state,
      {
        payload,
      }: PayloadAction<{
        txId: string;
        /** What the built tx actually paid and withdrew, not what was forecast. */
        fee?: bigint;
        withdrawnRewards?: bigint;
      }>,
    ) => {
      if (state.step !== 'sweeping') return;
      // Not `done`: the funds have moved but the destination is not yet
      // delegated, and the condition of use is not met until it is. The
      // delegation side-effect settles this step — including straight to
      // `done` when there is nothing to delegate to.
      state.step = 'delegating';
      state.delegationPhase = 'settling';
      state.sweepTxId = payload.txId;
      state.sweptFee = payload.fee === undefined ? undefined : `${payload.fee}`;
      state.sweptRewards =
        payload.withdrawnRewards === undefined
          ? undefined
          : `${payload.withdrawnRewards}`;
    },
    /**
     * The sweep made the planned destination accounts real. The wizard's
     * primary destination re-points to the first of them — for an existing
     * destination that is a FRESH account, not the one the picker named —
     * so the done screen and the delegation act on where funds actually land.
     */
    destinationAccountsPrepared: (
      state,
      {
        payload,
      }: PayloadAction<{
        accounts: { destinationAccountIndex: number; accountId: AccountId }[];
      }>,
    ) => {
      if (state.step !== 'sweeping') return;
      if (payload.accounts.length === 0) return;
      state.destinationAccountId = payload.accounts[0].accountId;
      state.preparedDestinationAccounts = payload.accounts;
      // The plan said "the next index past the highest one loaded"; the probe
      // may have walked further because an index turned out used on chain.
      // Repoint the mapping onto what was actually prepared, in the order it
      // was requested, so the report, the delegation and the done screen all
      // name the accounts the funds really landed in.
      if (state.accountMapping) {
        if (state.migrationMode === 'preserve') {
          const funded = state.accountMapping.filter(row => row.utxoCount > 0);
          for (const [position, row] of funded.entries()) {
            const prepared = payload.accounts[position];
            if (prepared)
              row.destinationAccountIndex = prepared.destinationAccountIndex;
          }
        } else {
          // Consolidation lands everything in one account, so every row points
          // at the single account that was prepared.
          for (const row of state.accountMapping) {
            row.destinationAccountIndex =
              payload.accounts[0].destinationAccountIndex;
          }
        }
      }
    },
    /**
     * The delegation side-effect reporting where it actually is, so the
     * waiting screen shows one true line instead of every instruction at once.
     */
    delegationPhaseChanged: (
      state,
      {
        payload,
      }: PayloadAction<{
        phase: DelegationPhase;
        /** Which account of how many is being set up, when more than one is
         * (preserve mode registers a stake key per migrated account). */
        accountNumber?: number;
        accountCount?: number;
      }>,
    ) => {
      if (state.step !== 'delegating') return;
      state.delegationPhase = payload.phase;
      state.delegationAccountNumber = payload.accountNumber;
      state.delegationAccountCount = payload.accountCount;
    },
    /**
     * One account's rewards set-up reached the node. Recorded per account, and
     * separately from settling, because the set-up runs once per destination
     * while only the last of them settles the step.
     */
    delegationSubmitted: (
      state,
      { payload }: PayloadAction<DelegationSubmission>,
    ) => {
      const submissions = state.delegationSubmissions ?? [];
      // A re-dispatch of the same submission is a duplicate report, not a second
      // transaction; a genuine resubmission carries a different id.
      if (submissions.some(({ txId }) => txId === payload.txId)) return;
      state.delegationSubmissions = [...submissions, payload];
    },
    /**
     * The destination is delegated, or there was never anything to delegate.
     * Both land on `done`; the outcome tells the summary which happened, so a
     * skipped delegation can never be reported as one that ran.
     */
    delegationSettled: (
      state,
      { payload }: PayloadAction<{ outcome: DelegationOutcome }>,
    ) => {
      // Accepted from `delegationPaused` as well: a straggler stepFailed can
      // pause the wizard while a run is still in flight, and that run's later
      // settle is the truth — dropping it records (and telemeters) a delegated
      // wallet as undelegated, and offers a retry that would double-submit.
      if (state.step !== 'delegating' && state.step !== 'delegationPaused')
        return;
      state.step = 'done';
      state.delegationOutcome = payload.outcome;
      state.delegationPhase = undefined;
      state.errorKey = undefined;
    },
    /**
     * Modelled on `sweepPaused`, and for the same reason: the sweep has already
     * moved the funds, so discarding the migration here would strand a wizard
     * that is past "nothing happened". Offers retry and finish-undelegated.
     * Auth cancellation lands here too — leaving the wizard on `delegating`
     * would strand it with no actions.
     */
    delegationPaused: (
      state,
      {
        payload,
      }: PayloadAction<{
        errorKey: TranslationKey;
        phase?: DelegationFailurePhase;
        deviceHintKey?: DeviceWaitHintKey;
      }>,
    ) => {
      if (state.step !== 'delegating') return;
      state.failedStep = 'delegating';
      state.step = 'delegationPaused';
      state.delegationPhase = undefined;
      state.errorKey = payload.errorKey;
      state.delegationFailurePhase = payload.phase;
      state.deviceWaitHintKey = payload.deviceHintKey;
    },
    delegationRetryRequested: state => {
      if (state.step !== 'delegationPaused') return;
      state.step = 'delegating';
      state.deviceWaitHintKey = undefined;
      // A retry usually finds the funds already settled, so the gate opens
      // straight into `confirming` — but that is the side-effect's call.
      state.delegationPhase = 'settling';
      state.errorKey = undefined;
    },
    /**
     * The user gave up on the delegation and finished anyway. A real outcome,
     * recorded as such: the done screen warns and offers recovery rather than
     * reporting a migration that met its conditions.
     */
    delegationAbandoned: state => {
      if (state.step !== 'delegationPaused') return;
      state.step = 'done';
      state.delegationOutcome = { status: 'undelegated' };
      state.errorKey = undefined;
    },
    stepFailed: (
      state,
      {
        payload,
      }: PayloadAction<{
        errorKey: TranslationKey;
        deviceHintKey?: DeviceWaitHintKey;
      }>,
    ) => {
      // Only fail an in-progress wizard. A failure surfacing after the flow was
      // abandoned (idle) or finished (done) must not resurrect it — e.g. a
      // provider timeout landing after the user cancelled.
      if (state.step === 'idle' || state.step === 'done') return;
      // Past the sweep the generic failure screen is the wrong one: its primary
      // cancels, which would discard a migration whose funds have already
      // moved. A late failure here is a paused delegation, retryable like any
      // other — e.g. a sweep error arriving after sweepSucceeded.
      if (state.step === 'delegating' || state.step === 'delegationPaused') {
        state.failedStep = 'delegating';
        state.step = 'delegationPaused';
        state.errorKey = payload.errorKey;
        state.deviceWaitHintKey = payload.deviceHintKey;
        return;
      }
      state.failedStep = state.step;
      state.step = 'failed';
      state.errorKey = payload.errorKey;
      state.deviceWaitHintKey = payload.deviceHintKey;
    },
  },
  selectors: {
    selectStep: ({ step }): MigrateWalletStep => step,
    selectDestinationType: ({ destinationType }) => destinationType,
    selectSourceWalletId: ({ sourceWalletId }) => sourceWalletId,
    selectSourceAccountId: ({ sourceAccountId }) => sourceAccountId,
    selectSourceNetworkType: ({ sourceNetworkType }) => sourceNetworkType,
    selectDestinationWalletId: ({ destinationWalletId }) => destinationWalletId,
    selectDestinationAccountId: ({ destinationAccountId }) =>
      destinationAccountId,
    selectDiscovery: ({ discovery }) => discovery,
    selectReviewedSweepPlan: ({
      reviewedSweepPlan,
    }): ReviewedSweepPlan | undefined =>
      reviewedSweepPlan
        ? Serializable.from<ReviewedSweepPlan>(
            reviewedSweepPlan as Serializable<ReviewedSweepPlan>,
          )
        : undefined,
    selectSweepTxId: ({ sweepTxId }) => sweepTxId,
    selectSweptFee: ({ sweptFee }) => sweptFee,
    selectSweptRewards: ({ sweptRewards }) => sweptRewards,
    selectSweepProgress: ({ sweepProgress }) => sweepProgress,
    selectDelegationOutcome: ({ delegationOutcome }) => delegationOutcome,
    selectNeedsPoolChoice: ({ needsPoolChoice }) => needsPoolChoice,
    selectWasModeOffered: ({ wasModeOffered }) => wasModeOffered,
    selectChosenPool: ({ chosenPool }) => chosenPool,
    selectDelegationSubmissions: ({ delegationSubmissions }) =>
      delegationSubmissions,
    selectMigrationMode: ({ migrationMode }) => migrationMode,
    selectAccountMapping: ({ accountMapping }) => accountMapping,
    selectPreparedDestinationAccounts: ({ preparedDestinationAccounts }) =>
      preparedDestinationAccounts,
    selectPendingSourceWalletId: ({ pendingSourceWalletId }) =>
      pendingSourceWalletId,
    selectPendingHwDestinationDevice: ({ pendingHwDestinationDevice }) =>
      pendingHwDestinationDevice,
    selectResolvedDestinationIndexes: ({ resolvedDestinationIndexes }) =>
      resolvedDestinationIndexes,
    selectDelegationPhase: ({ delegationPhase }) => delegationPhase,
    // Raw fields, not a derived object: a per-call object would be a new
    // reference on every store change and re-render the wizard with it.
    selectDelegationAccountNumber: ({ delegationAccountNumber }) =>
      delegationAccountNumber,
    selectDelegationAccountCount: ({ delegationAccountCount }) =>
      delegationAccountCount,
    selectDelegationFailurePhase: ({ delegationFailurePhase }) =>
      delegationFailurePhase,
    selectPendingHwDestination: ({ pendingHwDestination }) =>
      pendingHwDestination,
    selectPendingHwSource: ({ pendingHwSource }) => pendingHwSource,
    selectDeviceWaitHintKey: ({ deviceWaitHintKey }) => deviceWaitHintKey,
    selectErrorKey: ({ errorKey }) => errorKey,
    selectFailedStep: ({ failedStep }) => failedStep,
    selectUnsupportedAmount: ({ unsupportedAmount }) => unsupportedAmount,
  },
});

export const migrateWalletReducers = {
  [slice.name]: slice.reducer,
};

export const migrateWalletActions = {
  migrateWallet: slice.actions,
};

export const migrateWalletSelectors = {
  migrateWallet: slice.selectors,
};
