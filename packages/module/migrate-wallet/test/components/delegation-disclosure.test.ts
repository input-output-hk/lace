import { Cardano } from '@cardano-sdk/core';
import { AccountId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import {
  planDelegationDisclosure,
  rewardsDelegationNoteKey,
} from '../../src/components/delegation-disclosure';

import type { AccountMapping } from '../../src/store/slice';
import type { EarnRewardsTarget } from '@lace-contract/earn-rewards';
import type { AnyWallet } from '@lace-contract/wallet-repo';

const POOL = Cardano.PoolId(
  'pool132jxjzyw4awr3s75ltcdx5tv5ecv6m042306l630wqjckhfm32r',
);
const DREP = 'drep1y2v8w544v5teexvycd6zqgh2686yz7050tdv834yegpt0gsnampev';
const NETWORK = 'cardano-preprod' as unknown;
const DEPOSIT = 2_000_000;

const target: EarnRewardsTarget = {
  poolId: POOL,
  dRep: { type: 'specific', drepId: Cardano.DRepID(DREP) },
};

const account = (accountIndex: number) => ({
  accountId: AccountId(`dest-${accountIndex}`),
  blockchainName: 'Cardano',
  blockchainNetworkId: NETWORK,
  blockchainSpecific: { accountIndex },
});

/** An existing wallet whose own account 0 already stakes to the promoted DRep. */
const existingWallet = (indexes: number[]): AnyWallet =>
  ({
    walletId: 'dest',
    accounts: indexes.map(account),
  } as unknown as AnyWallet);

const mappingRow = (
  sourceAccountIndex: number,
  destinationAccountIndex: number,
  {
    utxoCount = 1,
    sourcePoolId,
  }: { utxoCount?: number; sourcePoolId?: string } = {},
): AccountMapping[number] => ({
  sourceAccountIndex,
  destinationAccountIndex,
  coin: '5000000',
  assetCount: 0,
  utxoCount,
  ...(sourcePoolId === undefined ? {} : { sourcePoolId }),
});

/** Where a source account already staked, distinct from the target's pool. */
const SOURCE_POOL = 'pool106jtt06k5wjpqc5r5fkz06pgwhwaljzs624mnfua8fkhq0fl9am';

const base = {
  target,
  stakeKeyDeposit: DEPOSIT,
  blockchainNetworkId: NETWORK,
  fallbackAccountId: AccountId('dest-0'),
  preserveUnfundedSetupAccounts: undefined,
};

describe('planDelegationDisclosure', () => {
  // The bug this pins: the picked destination account may already be fully set
  // up while the accounts the funds LAND in are fresh and still need
  // registering. Reading the picked account reported "nothing changes" and hid
  // the deposits the user is about to pay.
  it('reports registrations for fresh landing accounts even when the picked account is already delegated', () => {
    const disclosure = planDelegationDisclosure({
      ...base,
      accountMapping: [mappingRow(0, 1), mappingRow(1, 2)],
      migrationMode: 'preserve',
      destinationWallet: existingWallet([0]),
      rewardAccountDetails: {
        // Account 0 — named by the picker, receives nothing.
        [AccountId('dest-0')]: {
          rewardAccountInfo: { poolId: 'pool1theirs', drepId: DREP },
        },
      },
    });
    expect(disclosure).toEqual({
      kind: 'register',
      deposit: `${BigInt(DEPOSIT) * 2n}`,
      accountCount: 2,
    });
  });

  it('reports one registration in consolidate mode, for the single landing account', () => {
    const disclosure = planDelegationDisclosure({
      ...base,
      accountMapping: [mappingRow(0, 1), mappingRow(1, 2)],
      migrationMode: 'consolidate',
      destinationWallet: existingWallet([0]),
      rewardAccountDetails: {},
    });
    expect(disclosure).toEqual({
      kind: 'register',
      deposit: `${DEPOSIT}`,
      accountCount: 1,
    });
  });

  // The only case that legitimately claims nothing changes: the account the
  // funds land in already exists AND already has the promoted DRep.
  it('says already-delegated when every landing account holds the promoted DRep', () => {
    const disclosure = planDelegationDisclosure({
      ...base,
      accountMapping: [mappingRow(0, 0)],
      migrationMode: 'consolidate',
      destinationWallet: existingWallet([0]),
      rewardAccountDetails: {
        [AccountId('dest-0')]: {
          rewardAccountInfo: { poolId: 'pool1theirs', drepId: DREP },
        },
      },
    });
    expect(disclosure).toEqual({ kind: 'already-delegated' });
  });

  it('charges no deposit for a landing account that already stakes without a DRep', () => {
    const disclosure = planDelegationDisclosure({
      ...base,
      accountMapping: [mappingRow(0, 0)],
      migrationMode: 'consolidate',
      destinationWallet: existingWallet([0]),
      rewardAccountDetails: {
        [AccountId('dest-0')]: {
          rewardAccountInfo: { poolId: 'pool1theirs' },
        },
      },
    });
    expect(disclosure).toEqual({ kind: 'vote-only' });
  });

  it('rewards-only source rows are not landing accounts, so they cost no deposit', () => {
    const disclosure = planDelegationDisclosure({
      ...base,
      // Source account 1 holds only rewards: preserve mode refuses it, so it
      // gets no destination account and no registration.
      accountMapping: [mappingRow(0, 1), mappingRow(1, 2, { utxoCount: 0 })],
      migrationMode: 'preserve',
      destinationWallet: existingWallet([0]),
      rewardAccountDetails: {},
    });
    expect(disclosure).toEqual({
      kind: 'register',
      deposit: `${DEPOSIT}`,
      accountCount: 1,
    });
  });

  /**
   * The contradiction this closes. With no promoted pool and no choice made —
   * which is what happens when preservation leaves nothing to choose — the
   * disclosure read the target alone, found no pool, and reported that nothing
   * would be set up. The delegation meanwhile registers each account against
   * the pool it is keeping. The review has to describe the run that will
   * actually happen.
   */
  it('counts a preserved pool as a registration, with no promoted or chosen pool', () => {
    const disclosure = planDelegationDisclosure({
      ...base,
      target: { ...target, poolId: undefined },
      accountMapping: [
        mappingRow(0, 0, { sourcePoolId: SOURCE_POOL }),
        mappingRow(1, 1, { sourcePoolId: SOURCE_POOL }),
      ],
      migrationMode: 'preserve',
      destinationWallet: existingWallet([0, 1]),
      rewardAccountDetails: {},
    });
    expect(disclosure).toEqual({
      kind: 'register',
      deposit: `${BigInt(DEPOSIT) * 2n}`,
      accountCount: 2,
      chosenPool: undefined,
      preservedPoolCount: 2,
    });
  });

  // Stated, not assumed: a migration that quietly moved a delegation the user
  // chose is worse than one that never offered to keep it.
  it('reports how many accounts keep their pool', () => {
    const disclosure = planDelegationDisclosure({
      ...base,
      accountMapping: [
        mappingRow(0, 0, { sourcePoolId: SOURCE_POOL }),
        mappingRow(1, 1),
      ],
      migrationMode: 'preserve',
      destinationWallet: existingWallet([0, 1]),
      rewardAccountDetails: {},
    });
    expect(disclosure).toMatchObject({ preservedPoolCount: 1 });
  });

  /**
   * The declined mix: the kept account registers, the fresh one gets NO
   * certificate at all. The card must carry that count — without it the run
   * read as setting up "your accounts" while leaving one with nothing.
   */
  it('counts the accounts a declined choice leaves with no set-up', () => {
    const disclosure = planDelegationDisclosure({
      ...base,
      target: { ...target, poolId: undefined },
      accountMapping: [
        mappingRow(0, 0, { sourcePoolId: SOURCE_POOL }),
        mappingRow(1, 1),
      ],
      migrationMode: 'preserve',
      destinationWallet: existingWallet([0, 1]),
      rewardAccountDetails: {},
      poolChoiceDeclined: true,
    });
    expect(disclosure).toMatchObject({
      kind: 'register',
      accountCount: 1,
      deposit: `${BigInt(DEPOSIT)}`,
      preservedPoolCount: 1,
      unsetAccountCount: 1,
    });
  });

  /**
   * The run's own filter, mirrored: an account disclosed as unable to cover
   * its set-up is skipped by the delegation, so the card must not price its
   * deposit or claim its pool is kept — the sweep dissolves that delegation
   * and nothing re-creates it.
   */
  it('excludes accounts the discovery disclosed as unable to cover their set-up', () => {
    const disclosure = planDelegationDisclosure({
      ...base,
      target: { ...target, poolId: undefined },
      accountMapping: [
        mappingRow(0, 0, { sourcePoolId: SOURCE_POOL }),
        mappingRow(1, 1, { sourcePoolId: SOURCE_POOL }),
      ],
      migrationMode: 'preserve',
      destinationWallet: existingWallet([0, 1]),
      rewardAccountDetails: {},
      preserveUnfundedSetupAccounts: [1],
    });
    expect(disclosure).toMatchObject({
      kind: 'register',
      accountCount: 1,
      deposit: `${BigInt(DEPOSIT)}`,
      preservedPoolCount: 1,
    });
  });

  /**
   * The card must read the account the sweep PAYS — the first MIGRATABLE row
   * (consolidateLandingRow) — not row 0. With a rewards-only row 0 whose
   * destination is an already-delegated picked account, reading row 0 said
   * "already delegated" and hid a deposit the run still charges when it
   * registers the real landing account.
   */
  it('reads the consolidate landing row, not row 0, when row 0 does not migrate', () => {
    const rewardsOnlyRow = {
      ...mappingRow(0, 7, { utxoCount: 0 }),
      coin: '0',
    };
    const disclosure = planDelegationDisclosure({
      ...base,
      accountMapping: [rewardsOnlyRow, mappingRow(1, 3)],
      migrationMode: 'consolidate',
      destinationWallet: existingWallet([7, 3]),
      // Row 0's destination (the picked account) already stakes and votes;
      // the landing account (index 3) is fresh.
      rewardAccountDetails: {
        [AccountId('dest-7')]: {
          rewardAccountInfo: { poolId: 'pool1theirs', drepId: DREP },
        },
      } as never,
    });
    expect(disclosure).toMatchObject({
      kind: 'register',
      accountCount: 1,
      deposit: `${BigInt(DEPOSIT)}`,
    });
  });

  /**
   * Consolidate merges the accounts and with them any number of pools, so
   * nothing is preserved and the review must not claim otherwise — even though
   * the rows still carry the pools their sources used.
   */
  it('claims no preservation in consolidate', () => {
    const disclosure = planDelegationDisclosure({
      ...base,
      accountMapping: [
        mappingRow(0, 0, { sourcePoolId: SOURCE_POOL }),
        mappingRow(1, 1, { sourcePoolId: SOURCE_POOL }),
      ],
      migrationMode: 'consolidate',
      destinationWallet: existingWallet([0, 1]),
      rewardAccountDetails: {},
    });
    expect(disclosure).toMatchObject({ preservedPoolCount: undefined });
  });

  it('is absent with no promoted target: there is nothing to disclose', () => {
    expect(
      planDelegationDisclosure({
        ...base,
        target: undefined,
        accountMapping: [mappingRow(0, 0)],
        migrationMode: 'consolidate',
        destinationWallet: existingWallet([0]),
        rewardAccountDetails: {},
      }),
    ).toBeUndefined();
  });

  // ── The wizard's pool choice (LW-15293) ──
  const dRepOnlyTarget: EarnRewardsTarget = { dRep: target.dRep };
  const chosenPool = { poolId: `${POOL}`, ticker: 'PICK', ros: 0.031 };

  it('echoes the chosen pool on the register disclosure', () => {
    const disclosure = planDelegationDisclosure({
      ...base,
      // The wizard substitutes the chosen pool into the target before calling.
      target,
      chosenPool,
      accountMapping: [mappingRow(0, 1)],
      migrationMode: 'consolidate',
      destinationWallet: existingWallet([0]),
      rewardAccountDetails: {},
    });
    expect(disclosure).toEqual({
      kind: 'register',
      deposit: `${DEPOSIT}`,
      accountCount: 1,
      chosenPool,
    });
  });

  // A fresh key with no pool cannot be set up at all (a vote certificate
  // cannot reference an unregistered credential): after a declined choice the
  // review states that consequence instead of showing nothing.
  it('reports the declined choice when nothing can run for fresh landing accounts', () => {
    const disclosure = planDelegationDisclosure({
      ...base,
      target: dRepOnlyTarget,
      poolChoiceDeclined: true,
      accountMapping: [mappingRow(0, 1)],
      migrationMode: 'consolidate',
      destinationWallet: existingWallet([0]),
      rewardAccountDetails: {},
    });
    expect(disclosure).toEqual({ kind: 'declined' });
  });

  // The same shape WITHOUT a decline (a dRep-only config that never offered a
  // choice) discloses nothing — there was no decision to report on.
  it('is absent when nothing can run and no choice was declined', () => {
    const disclosure = planDelegationDisclosure({
      ...base,
      target: dRepOnlyTarget,
      accountMapping: [mappingRow(0, 1)],
      migrationMode: 'consolidate',
      destinationWallet: existingWallet([0]),
      rewardAccountDetails: {},
    });
    expect(disclosure).toBeUndefined();
  });

  // Declining skips only the stake leg: a landing account whose credential is
  // already registered still gets its vote delegated — the condition of use.
  it('still discloses vote-only after a decline when the landing account already stakes', () => {
    const disclosure = planDelegationDisclosure({
      ...base,
      target: dRepOnlyTarget,
      poolChoiceDeclined: true,
      accountMapping: [mappingRow(0, 0)],
      migrationMode: 'consolidate',
      destinationWallet: existingWallet([0]),
      rewardAccountDetails: {
        [AccountId('dest-0')]: {
          rewardAccountInfo: { poolId: 'pool1theirs' },
        },
      },
    });
    expect(disclosure).toEqual({ kind: 'vote-only' });
  });
});

describe('rewardsDelegationNoteKey', () => {
  // The full 2×2: who picked the pool × whether a vote delegation rides along.
  // Each combination is a different true sentence; crediting Lace with the
  // user's choice — or promising a vote a pool-only target never submits — is
  // the drift this pins against.
  it('names the right sentence for every combination', () => {
    expect(
      rewardsDelegationNoteKey({ hasChosenPool: false, delegatesVote: true }),
    ).toBe('migrate-wallet.review.rewards-delegation-note');
    expect(
      rewardsDelegationNoteKey({ hasChosenPool: true, delegatesVote: true }),
    ).toBe('migrate-wallet.review.rewards-delegation-note-chosen');
    expect(
      rewardsDelegationNoteKey({ hasChosenPool: false, delegatesVote: false }),
    ).toBe('migrate-wallet.review.rewards-delegation-note-stake-only');
    expect(
      rewardsDelegationNoteKey({ hasChosenPool: true, delegatesVote: false }),
    ).toBe('migrate-wallet.review.rewards-delegation-note-chosen-stake-only');
  });

  /**
   * The bug this closes. Preservation is not a variation of "who picked the
   * pool" — nobody picked one. The promoted sentence claimed the wallet was
   * delegated to Lace's pool while the accounts kept their own, so the review
   * contradicted the row beneath it.
   */
  it('says the pools were kept, whoever else might have picked one', () => {
    expect(
      rewardsDelegationNoteKey({
        hasChosenPool: false,
        delegatesVote: true,
        preservation: 'all',
      }),
    ).toBe('migrate-wallet.review.rewards-delegation-note-preserved');
    // Even with a chosen pool recorded: if every account being set up keeps its
    // own, the choice applied to none of them.
    expect(
      rewardsDelegationNoteKey({
        hasChosenPool: true,
        delegatesVote: true,
        preservation: 'all',
      }),
    ).toBe('migrate-wallet.review.rewards-delegation-note-preserved');
  });

  // Nothing about staking changes and there is no vote to mention either.
  it('narrows to staking alone when no vote rides along', () => {
    expect(
      rewardsDelegationNoteKey({
        hasChosenPool: false,
        delegatesVote: false,
        preservation: 'all',
      }),
    ).toBe('migrate-wallet.review.rewards-delegation-note-preserved-vote-only');
  });

  /**
   * The declined mix. The all-kept plural told accounts that receive no
   * certificate their voting power was moving; the promoted and chosen
   * sentences name a pick nobody made for them. Only the partial sentence is
   * true of both halves of the run.
   */
  it('states the split when only some accounts keep a pool and the rest get nothing', () => {
    expect(
      rewardsDelegationNoteKey({
        hasChosenPool: false,
        delegatesVote: true,
        preservation: 'partial',
      }),
    ).toBe('migrate-wallet.review.rewards-delegation-note-preserved-partial');
  });
});
