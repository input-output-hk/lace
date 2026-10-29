// Pending withdrawals (LW-15725): a submitted transaction's rewards already
// sit in its pending outputs, so the balance must not also count them as
// withdrawable, and builders must know they are spoken for.
import { Cardano } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber, Timestamp } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import {
  applyPendingRewardWithdrawals,
  pendingRewardWithdrawalKey,
  pendingRewardWithdrawals,
} from '../src/apply-in-flight-utxo-adjustments';

import type { CardanoActivityUtxoMetadata } from '../src/augmentations';
import type { AccountRewardAccountDetailsMap } from '../src/types';
import type { Activity } from '@lace-contract/activities';
import type { AnyAddress } from '@lace-contract/addresses';

const ACCOUNT_A = AccountId('account-a');
const ACCOUNT_B = AccountId('account-b');
// Same wallet keys on Preview: Preview and Preprod share reward addresses.
const ACCOUNT_A_PREVIEW = AccountId('account-a-preview');
const PREPROD = Cardano.NetworkMagics.Preprod;
const PREVIEW = Cardano.NetworkMagics.Preview;
const KEY_A = Cardano.RewardAccount(
  'stake_test1up7pvfq8zn4quy45r2g572290p9vf99mr9tn7r9xrgy2l2qdsf58d',
);
const KEY_B = Cardano.RewardAccount(
  'stake_test1upjghly04re6yrr3nh3ntp9en3p5flnxh2yf6camc3vfhwg6dhc5w',
);

const pending = ({
  accountId,
  activityId,
  withdrawals,
  type = ActivityType.Pending,
}: {
  accountId: AccountId;
  activityId: string;
  withdrawals?: Cardano.Withdrawal[];
  type?: ActivityType;
}): Activity => ({
  accountId,
  activityId,
  timestamp: Timestamp(0),
  tokenBalanceChanges: [],
  type,
  blockchainSpecific: {
    Cardano: {
      consumedInputs: [],
      producedOutputs: [],
      ...(withdrawals && { withdrawals }),
    } satisfies CardanoActivityUtxoMetadata,
  },
});

const address = ({
  accountId,
  name,
  networkMagic,
  rewardAccount,
}: {
  accountId: AccountId;
  name: string;
  networkMagic: Cardano.NetworkMagic;
  rewardAccount?: Cardano.RewardAccount;
}) =>
  ({
    accountId,
    address: name,
    blockchainName: 'Cardano',
    data: { networkMagic, ...(rewardAccount && { rewardAccount }) },
  } as unknown as AnyAddress);

const addresses = [
  address({ accountId: ACCOUNT_A, name: 'addr-a0', networkMagic: PREPROD }),
  address({
    accountId: ACCOUNT_A,
    name: 'addr-a1',
    networkMagic: PREPROD,
    rewardAccount: KEY_A,
  }),
  address({
    accountId: ACCOUNT_A,
    name: 'addr-a2',
    networkMagic: PREPROD,
    rewardAccount: KEY_B,
  }),
  address({
    accountId: ACCOUNT_B,
    name: 'addr-b0',
    networkMagic: PREPROD,
    rewardAccount: KEY_B,
  }),
  address({
    accountId: ACCOUNT_A_PREVIEW,
    name: 'addr-ap0',
    networkMagic: PREVIEW,
    rewardAccount: KEY_A,
  }),
];

const key = (rewardAccount: Cardano.RewardAccount, networkMagic = PREPROD) =>
  pendingRewardWithdrawalKey(networkMagic, rewardAccount);

describe('pendingRewardWithdrawals', () => {
  it('sums withdrawals per reward account across every account of a network', () => {
    // A tx recorded for account A that withdraws B's rewards still counts for B.
    const totals = pendingRewardWithdrawals(
      {
        [ACCOUNT_A]: [
          pending({
            accountId: ACCOUNT_A,
            activityId: 'tx-1',
            withdrawals: [
              { stakeAddress: KEY_A, quantity: 3n },
              { stakeAddress: KEY_B, quantity: 5n },
            ],
          }),
          pending({
            accountId: ACCOUNT_A,
            activityId: 'tx-2',
            withdrawals: [{ stakeAddress: KEY_A, quantity: 4n }],
          }),
        ],
      },
      addresses,
    );

    expect(totals).toEqual(
      new Map([
        [key(KEY_A), 7n],
        [key(KEY_B), 5n],
      ]),
    );
  });

  it('counts a transaction recorded for several accounts once', () => {
    const withdrawals = [{ stakeAddress: KEY_A, quantity: 3n }];
    const totals = pendingRewardWithdrawals(
      {
        [ACCOUNT_A]: [
          pending({
            accountId: ACCOUNT_A,
            activityId: 'tx-1',
            withdrawals: withdrawals,
          }),
        ],
        [ACCOUNT_B]: [
          pending({
            accountId: ACCOUNT_B,
            activityId: 'tx-1',
            withdrawals: withdrawals,
          }),
        ],
      },
      addresses,
    );

    expect(totals.get(key(KEY_A))).toBe(3n);
  });

  it('keeps networks apart even when the reward address is the same', () => {
    const totals = pendingRewardWithdrawals(
      {
        [ACCOUNT_A_PREVIEW]: [
          pending({
            accountId: ACCOUNT_A_PREVIEW,
            activityId: 'tx-preview',
            withdrawals: [{ stakeAddress: KEY_A, quantity: 3n }],
          }),
        ],
      },
      addresses,
    );

    expect(totals.get(key(KEY_A, PREVIEW))).toBe(3n);
    expect(totals.has(key(KEY_A))).toBe(false);
  });

  it('ignores settled activities, activities without withdrawals and accounts of unknown network', () => {
    const totals = pendingRewardWithdrawals(
      {
        [ACCOUNT_A]: [
          pending({
            accountId: ACCOUNT_A,
            activityId: 'tx-settled',
            withdrawals: [{ stakeAddress: KEY_A, quantity: 3n }],
            type: ActivityType.Send,
          }),
          pending({ accountId: ACCOUNT_A, activityId: 'tx-no-withdrawal' }),
        ],
        [AccountId('account-without-addresses')]: [
          pending({
            accountId: AccountId('account-without-addresses'),
            activityId: 'tx-3',
            withdrawals: [{ stakeAddress: KEY_A, quantity: 3n }],
          }),
        ],
      },
      addresses,
    );

    expect(totals.size).toBe(0);
  });
});

describe('applyPendingRewardWithdrawals', () => {
  const details = (
    withdrawableA: bigint,
    withdrawableB = 20n,
  ): AccountRewardAccountDetailsMap =>
    ({
      [ACCOUNT_A]: {
        rewardAccountInfo: {
          isRegistered: true,
          withdrawableAmount: BigNumber(withdrawableA),
        },
      },
      [ACCOUNT_B]: {
        rewardAccountInfo: {
          isRegistered: true,
          withdrawableAmount: BigNumber(withdrawableB),
        },
      },
      [ACCOUNT_A_PREVIEW]: {
        rewardAccountInfo: {
          isRegistered: true,
          withdrawableAmount: BigNumber(30n),
        },
      },
    } as unknown as AccountRewardAccountDetailsMap);

  const withdrawableOf = (
    map: AccountRewardAccountDetailsMap,
    accountId: AccountId,
  ) => map[accountId]?.rewardAccountInfo.withdrawableAmount;

  it.each([
    {
      label: 'above the pending withdrawal',
      withdrawable: 10n,
      reserved: 4n,
      expected: '6',
    },
    {
      label: 'equal to the pending withdrawal',
      withdrawable: 10n,
      reserved: 10n,
      expected: '0',
    },
    {
      label: 'below the pending withdrawal (never negative)',
      withdrawable: 3n,
      reserved: 10n,
      expected: '0',
    },
  ])(
    'subtracts pending withdrawals from a balance $label',
    ({ withdrawable, reserved, expected }) => {
      const result = applyPendingRewardWithdrawals(
        details(withdrawable),
        new Map([[key(KEY_A), reserved]]),
        addresses,
      );

      expect(withdrawableOf(result, ACCOUNT_A)).toBe(expected);
    },
  );

  it("matches the account's first stake key only", () => {
    // KEY_B is account A's second key, so it does not reduce A's details.
    const input = details(10n);
    const result = applyPendingRewardWithdrawals(
      input,
      new Map([[key(KEY_B), 4n]]),
      addresses,
    );

    expect(withdrawableOf(result, ACCOUNT_A)).toBe('10');
    expect(withdrawableOf(result, ACCOUNT_B)).toBe('16');
    expect(result[ACCOUNT_A]).toBe(input[ACCOUNT_A]);
  });

  it("only reduces the account on the withdrawal's network", () => {
    const input = details(10n);
    const result = applyPendingRewardWithdrawals(
      input,
      new Map([[key(KEY_A, PREVIEW), 4n]]),
      addresses,
    );

    expect(withdrawableOf(result, ACCOUNT_A_PREVIEW)).toBe('26');
    expect(withdrawableOf(result, ACCOUNT_A)).toBe('10');
  });

  it('keeps every other field of the reward details', () => {
    const input = details(10n);
    const result = applyPendingRewardWithdrawals(
      input,
      new Map([[key(KEY_A), 4n]]),
      addresses,
    );

    expect(result[ACCOUNT_A]?.rewardAccountInfo).toEqual({
      ...input[ACCOUNT_A]?.rewardAccountInfo,
      withdrawableAmount: BigNumber(6n),
    });
  });

  it('returns the same object when nothing changes', () => {
    const input = details(10n);

    expect(applyPendingRewardWithdrawals(input, new Map(), addresses)).toBe(
      input,
    );
    expect(
      applyPendingRewardWithdrawals(
        input,
        new Map([['1:stake_test-unrelated', 4n]]),
        addresses,
      ),
    ).toBe(input);
  });

  it('leaves an account with no reward account on its addresses unchanged', () => {
    const input = details(10n);
    const result = applyPendingRewardWithdrawals(
      input,
      new Map([[key(KEY_A), 4n]]),
      addresses.filter(entry => entry.accountId !== ACCOUNT_A),
    );

    expect(result).toBe(input);
  });
});
