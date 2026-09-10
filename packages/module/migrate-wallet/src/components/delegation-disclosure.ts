import { Cardano } from '@cardano-sdk/core';

import { consolidateLandingRow } from '../store/helpers/consolidate-landing-row';
import { delegationPlan } from '../store/side-effects/run-delegation';
import { isMigratableRow } from '../store/slice';

import type { DelegationDisclosure } from './ReviewSummary';
import type { AccountMapping, ChosenPool, MigrationMode } from '../store/slice';
import type { EarnRewardsTarget } from '@lace-contract/earn-rewards';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';

type RewardAccountDetails = Partial<
  Record<
    AccountId,
    { rewardAccountInfo?: { poolId?: unknown; drepId?: unknown } }
  >
>;

/**
 * What the post-sweep delegation will do, resolved against the accounts the
 * funds actually LAND in — not the account the destination picker named.
 *
 * These differ whenever the destination is an existing wallet: its migrated
 * funds go to fresh accounts past its highest index, so reading the picked
 * account's state would report an already-staking wallet as "nothing changes"
 * while the fresh accounts still need registering (and the user still pays the
 * deposits). A landing account that does not exist yet has no reward info to
 * read, which is exactly what makes it a fresh key.
 */
export const planDelegationDisclosure = ({
  target,
  stakeKeyDeposit,
  accountMapping,
  migrationMode,
  destinationWallet,
  blockchainNetworkId,
  rewardAccountDetails,
  fallbackAccountId,
  poolChoiceDeclined,
  preserveUnfundedSetupAccounts,
  chosenPool,
}: {
  target: EarnRewardsTarget | undefined;
  stakeKeyDeposit: bigint | number | string | undefined;
  accountMapping: AccountMapping | undefined;
  migrationMode: MigrationMode | undefined;
  destinationWallet: AnyWallet | undefined;
  blockchainNetworkId: unknown;
  rewardAccountDetails: RewardAccountDetails;
  /** Used when no plan exists yet (discovery has not completed). */
  fallbackAccountId: AccountId | undefined;
  /**
   * The user declined the wizard's pool choice (LW-15293): fresh landing
   * accounts get no set-up, and the review must say so rather than show
   * nothing where a cost disclosure usually sits.
   */
  poolChoiceDeclined?: boolean;
  /**
   * Source accounts the discovery disclosed as arriving with too little ADA to
   * cover their own set-up. The run skips their landing accounts entirely
   * (run-delegation's matching filter), so this card must not count, price, or
   * make claims about them — the mapping card already marks each such row.
   *
   * REQUIRED, not optional: this filter shipped once with no caller passing it
   * — the unit tests fed it directly, so nothing failed while the review
   * priced deposits the run never charges. A caller must now say `undefined`
   * on purpose.
   */
  preserveUnfundedSetupAccounts: number[] | undefined;
  /** Display fields of the pool the user chose, echoed on the register card. */
  chosenPool?: ChosenPool;
}): DelegationDisclosure | undefined => {
  if (!target || stakeKeyDeposit === undefined) return undefined;
  const depositEach = BigInt(stakeKeyDeposit);

  const accountIdForIndex = (accountIndex: number): AccountId | undefined =>
    destinationWallet?.accounts.find(
      account =>
        account.blockchainName === 'Cardano' &&
        account.blockchainNetworkId === blockchainNetworkId &&
        ((account.blockchainSpecific as { accountIndex?: number })
          ?.accountIndex ?? 0) === accountIndex,
    )?.accountId;

  // Preserve mode registers a stake key per migrated account; consolidation
  // lands everything in the plan's first account. With no plan yet, the picked
  // account is all there is to go on.
  const landingAccounts =
    accountMapping === undefined || accountMapping.length === 0
      ? [{ accountId: fallbackAccountId, preservedPoolId: undefined }]
      : (migrationMode === 'preserve'
          ? accountMapping
              .filter(isMigratableRow)
              // The same accounts run-delegation's unfunded filter skips: a
              // card that counted them would price deposits the run never
              // charges and claim pools kept that the sweep dissolves.
              .filter(
                row =>
                  !(preserveUnfundedSetupAccounts ?? []).includes(
                    row.sourceAccountIndex,
                  ),
              )
          : // The LANDING row, not row 0: the sweep pays the first MIGRATABLE
            // row (consolidateLandingRow), so with a rewards-only row 0 the
            // card read a different account than the run registers — an
            // already-delegated picked account there hid the deposit while the
            // run still charged it. No migratable row → nothing lands, and the
            // card must not describe a set-up for an account that gets none.
            (landing => (landing === undefined ? [] : [landing]))(
              consolidateLandingRow(accountMapping),
            ).map(({ position }) => accountMapping[position])
        ).map(row => ({
          accountId: accountIdForIndex(row.destinationAccountIndex),
          // Consolidate merges any number of pools, so nothing carries over —
          // the same rule the delegation itself applies.
          preservedPoolId:
            migrationMode === 'preserve' ? row.sourcePoolId : undefined,
        }));

  // What the delegation will do to each landing account. `nothing` is the
  // combination the builder cannot serve: a fresh (unregistered) key with no
  // pool to delegate to — a vote certificate cannot reference an unregistered
  // credential — so the run skips it (see run-delegation's matching guard).
  const outcomes = landingAccounts.map(({ accountId, preservedPoolId }) => {
    const info = accountId
      ? rewardAccountDetails[accountId]?.rewardAccountInfo
      : undefined;
    if (info === undefined) {
      // No account, or no info fetched for it: a fresh key, which is both the
      // common migration case and what the shortfall reserve assumed. A pool
      // being preserved is a pool to register with, even when none is promoted
      // and the user was never asked to choose.
      return target.poolId === undefined && preservedPoolId === undefined
        ? 'nothing'
        : 'register';
    }
    const plan = delegationPlan(
      target,
      info,
      preservedPoolId === undefined
        ? undefined
        : Cardano.PoolId(preservedPoolId),
    );
    if (plan === 'skip') return 'skip';
    // The runner submits nothing for this account, so the review must not
    // describe a change to it — previously this read as `vote-only` for an
    // already-staking account with no promoted DRep, promising a vote
    // delegation the transaction would not carry.
    if (plan === 'nothing') return 'nothing';
    if (plan.poolId !== undefined) return 'register';
    // The vote leg alone, which needs an already-registered credential.
    return info.poolId ? 'vote-only' : 'nothing';
  });

  if (outcomes.length > 0 && outcomes.every(outcome => outcome === 'skip')) {
    return { kind: 'already-delegated' };
  }
  const registrationCount = outcomes.filter(
    outcome => outcome === 'register',
  ).length;
  if (registrationCount > 0) {
    return {
      kind: 'register',
      deposit: `${depositEach * BigInt(registrationCount)}`,
      accountCount: registrationCount,
      // Landing accounts the run will leave with NO set-up at all — after a
      // declined choice, the fresh accounts in a mixed preserve run. The card
      // must say so: without this a run that sets up one account and skips
      // another read as setting up "your accounts".
      unsetAccountCount:
        outcomes.filter(outcome => outcome === 'nothing').length || undefined,
      chosenPool,
      // How many landing accounts keep the pool their source account used, and
      // absent when none do. The review has to say so: a migration that quietly
      // moved a delegation the user chose would be worse than one that never
      // offered to keep it.
      preservedPoolCount:
        landingAccounts.filter(
          ({ preservedPoolId }) => preservedPoolId !== undefined,
        ).length || undefined,
    };
  }
  if (outcomes.includes('vote-only')) return { kind: 'vote-only' };
  // Every landing account resolved to `nothing`. After a declined choice the
  // review states the consequence; otherwise there is nothing to disclose.
  return poolChoiceDeclined ? { kind: 'declined' } : undefined;
};

/**
 * Which sentence the register card's staking/voting row states.
 *
 * Whole sentences rather than assembled fragments: es and ja do not survive
 * concatenation, and the axes are real — who picked the pool (Lace's promoted
 * one, or the user's own choice) and whether a voting delegation rides along.
 * A single note credited Lace with a choice the user made, or promised a vote
 * delegation a pool-only target never submits.
 *
 * PRESERVATION IS NOT A THIRD AXIS. When accounts keep the pools they already
 * use, no pool was picked by anyone, so neither the promoted nor the chosen
 * sentence is true — and the `pools-kept` row states what happened to staking
 * anyway. This row narrows to the vote, the only thing the run changes. Adding
 * cells instead would have taken four near-identical sentences to eight, in
 * three languages.
 */
const REWARDS_DELEGATION_NOTES = {
  chosen: {
    stakeOnly:
      'migrate-wallet.review.rewards-delegation-note-chosen-stake-only',
    withVote: 'migrate-wallet.review.rewards-delegation-note-chosen',
  },
  promoted: {
    stakeOnly: 'migrate-wallet.review.rewards-delegation-note-stake-only',
    withVote: 'migrate-wallet.review.rewards-delegation-note',
  },
} as const;

/** What the row says when the pools are the accounts' own, not anyone's pick. */
const PRESERVED_NOTES = {
  withVote: 'migrate-wallet.review.rewards-delegation-note-preserved',
  stakeOnly:
    'migrate-wallet.review.rewards-delegation-note-preserved-vote-only',
} as const;

export const rewardsDelegationNoteKey = ({
  hasChosenPool,
  delegatesVote,
  preservation,
}: {
  hasChosenPool: boolean;
  delegatesVote: boolean;
  /**
   * 'all': every account being set up keeps the pool it already uses.
   * 'partial': some keep theirs while the rest — the user declined to pick for
   * them — get no set-up at all. No pool was picked by ANYONE there, so neither
   * the promoted nor the chosen sentence is true, and the all-kept plural would
   * promise a vote delegation to accounts that receive no certificate.
   */
  preservation?: 'all' | 'partial';
}) => {
  // One sentence pair regardless of the vote axis: a partial run is only
  // reachable through the pool choice, which only a DRep-carrying target
  // offers, so the vote leg always rides along for the accounts that are set up.
  if (preservation === 'partial')
    return 'migrate-wallet.review.rewards-delegation-note-preserved-partial';
  return preservation === 'all'
    ? PRESERVED_NOTES[delegatesVote ? 'withVote' : 'stakeOnly']
    : REWARDS_DELEGATION_NOTES[hasChosenPool ? 'chosen' : 'promoted'][
        delegatesVote ? 'withVote' : 'stakeOnly'
      ];
};
