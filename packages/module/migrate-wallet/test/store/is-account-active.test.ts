import { BigNumber } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import { isAccountActive } from '../../src/store/side-effects/scan-active-accounts';

import type { Cardano } from '@cardano-sdk/core';
import type { RewardAccountInfo } from '@lace-contract/cardano-context';

const rewardInfo = (
  overrides: Partial<
    Pick<RewardAccountInfo, 'isRegistered' | 'withdrawableAmount'>
  >,
): Pick<RewardAccountInfo, 'isRegistered' | 'withdrawableAmount'> => ({
  isRegistered: false,
  withdrawableAmount: BigNumber(0n),
  ...overrides,
});

const utxo = {} as unknown as Cardano.Utxo;

describe('isAccountActive', () => {
  it('is active when the account holds any UTxO', () => {
    expect(isAccountActive({ utxos: [utxo], rewardInfo: rewardInfo({}) })).toBe(
      true,
    );
  });

  it('is active when empty but the stake key is registered', () => {
    expect(
      isAccountActive({
        utxos: [],
        rewardInfo: rewardInfo({ isRegistered: true }),
      }),
    ).toBe(true);
  });

  it('is active when empty but rewards are withdrawable', () => {
    expect(
      isAccountActive({
        utxos: [],
        rewardInfo: rewardInfo({ withdrawableAmount: BigNumber(1n) }),
      }),
    ).toBe(true);
  });

  it('is inactive when empty, unregistered, and no withdrawable rewards', () => {
    expect(isAccountActive({ utxos: [], rewardInfo: rewardInfo({}) })).toBe(
      false,
    );
  });
});
