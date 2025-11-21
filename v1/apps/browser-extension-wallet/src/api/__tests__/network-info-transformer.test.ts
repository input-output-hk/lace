/* eslint-disable no-magic-numbers */
import '@testing-library/jest-dom';
import { networkInfoTransformer } from '../transformers';
import { Wallet } from '@lace/cardano';

const currentEpoch = {
  epochNo: Wallet.Cardano.EpochNo(100),
  firstSlot: {
    slot: Wallet.Cardano.Slot(8_547_194),
    date: new Date('2023-03-21 21:45:15')
  },
  lastSlot: {
    slot: Wallet.Cardano.Slot(8_568_062),
    date: new Date('2023-03-26 21:45:15')
  }
};
const lovelaceSupply = {
  circulating: BigInt(42_064_399_450_423_723),
  total: BigInt(40_267_211_394_073_980)
};
const stake = {
  active: BigInt(1_060_378_314_781_343),
  live: BigInt(15_001_884_895_856_815)
};

const stakePoolStats = {
  qty: {
    activating: 0,
    active: 1,
    retired: 0,
    retiring: 0
  }
};

const totalStakedPercentageResult =
  Number.parseInt(((stake.active * BigInt(1000)) / lovelaceSupply.circulating).toString()) / 10;

describe('Testing networkInfoTransformer function', () => {
  test('should format network data', () => {
    const result = networkInfoTransformer({ currentEpoch, lovelaceSupply, stake }, stakePoolStats);
    expect(result.totalStaked.number).toBe('1.06');
    expect(result.totalStaked.unit).toBe('B');
    expect(result.totalStakedPercentage).toBe(totalStakedPercentageResult);
    expect(result.nextEpochIn).toBe(currentEpoch.lastSlot.date);
    expect(result.currentEpoch).toBe(currentEpoch.epochNo.toString());
    expect(result.currentEpochIn).toBe(currentEpoch.firstSlot.date);
    expect(result.stakePoolsAmount).toBe(stakePoolStats.qty.active.toString());
  });
});
