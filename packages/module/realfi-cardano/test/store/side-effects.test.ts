import { CARDANO_NETWORK_MAGIC } from '@lace-contract/realfi-staking';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import {
  getCachedEarnedUsdPerSusdr,
  getCachedPendingUnstakeBaseUnits,
  getCachedStakingApy,
  getCachedVaultRate,
} from '../../src/realfi-yield';
import {
  makeEarnedUsdCache,
  makePendingUnstakeCache,
  makePendingUnstakeRefresh,
  makeStakingYieldPrime,
  makeYieldInfoCache,
} from '../../src/store/side-effects';

describe('makeEarnedUsdCache', () => {
  it('mirrors the store earned-per-sUSDr map into the module cache, emitting nothing', () => {
    const emissions: unknown[] = [];
    makeEarnedUsdCache(
      undefined as never,
      {
        realfiPosition: {
          selectEarnedUsdPerSusdrByNetwork$: of({ preview: 0.02, preprod: 0 }),
        },
      } as never,
      undefined as never,
    ).subscribe(action => emissions.push(action));

    expect(emissions).toEqual([]);
    expect(getCachedEarnedUsdPerSusdr('preview')).toBeCloseTo(0.02, 10);
    expect(getCachedEarnedUsdPerSusdr('preprod')).toBe(0);
    expect(getCachedEarnedUsdPerSusdr('mainnet')).toBeUndefined();
  });
});

describe('makePendingUnstakeCache', () => {
  it('mirrors the store pending-unstake total into the module cache, emitting nothing', () => {
    const emissions: unknown[] = [];
    makePendingUnstakeCache(
      undefined as never,
      {
        realfiPosition: {
          selectPendingUnstakeTotalBaseUnits$: of('3500250'),
        },
      } as never,
      undefined as never,
    ).subscribe(action => emissions.push(action));

    expect(emissions).toEqual([]);
    expect(getCachedPendingUnstakeBaseUnits()).toBe('3500250');
  });
});

describe('makeYieldInfoCache', () => {
  it('mirrors the store yield-info map into the module cache, emitting nothing', () => {
    const emissions: unknown[] = [];
    makeYieldInfoCache(
      undefined as never,
      {
        realfiPosition: {
          selectYieldInfoByNetwork$: of({
            preview: { apy: 0.117, exchangeRate: 1.05, fetchedAt: 0 },
          }),
        },
      } as never,
      undefined as never,
    ).subscribe(action => emissions.push(action));

    expect(emissions).toEqual([]);
    expect(getCachedStakingApy('preview')).toBeCloseTo(0.117, 10);
    expect(getCachedVaultRate('preview')).toBeCloseTo(1.05, 10);
    expect(getCachedStakingApy('mainnet')).toBeUndefined();
    expect(getCachedVaultRate('mainnet')).toBe(1);
  });
});

describe('makeStakingYieldPrime', () => {
  const REALFI_FLAG = { key: 'REALFI', payload: { preview: {} } };
  const yieldInfoRequested = () => ({ type: 'yieldInfoRequested' });
  const state = (featureFlagEmissions: unknown[][]) => ({
    features: {
      selectLoadedFeatures$: of(
        ...featureFlagEmissions.map(featureFlags => ({ featureFlags })),
      ),
    },
    network: {
      selectActiveNetworkId$: of(
        () => `cardano-${CARDANO_NETWORK_MAGIC.preview}`,
      ),
    },
  });
  const run = (featureFlagEmissions: unknown[][]) => {
    const emissions: unknown[] = [];
    makeStakingYieldPrime(
      undefined as never,
      state(featureFlagEmissions) as never,
      { actions: { realfiPosition: { yieldInfoRequested } } } as never,
    ).subscribe(action => emissions.push(action));
    return emissions;
  };

  it('requests the yield-info read once the flags enable a RealFi network', () => {
    expect(run([[REALFI_FLAG]])).toEqual([{ type: 'yieldInfoRequested' }]);
  });

  it('stays silent while no RealFi network is enabled', () => {
    expect(run([[]])).toEqual([]);
  });

  it('requests only once across repeated flag emissions with an unchanged network', () => {
    expect(run([[], [REALFI_FLAG], [REALFI_FLAG]])).toEqual([
      { type: 'yieldInfoRequested' },
    ]);
  });
});

describe('makePendingUnstakeRefresh', () => {
  const REALFI_FLAG = { key: 'REALFI', payload: { preview: {} } };
  const withdrawablesRequested = () => ({ type: 'withdrawablesRequested' });
  const state = (featureFlags: unknown[], accountCount: number) => ({
    features: { selectLoadedFeatures$: of({ featureFlags }) },
    network: {
      selectActiveNetworkId$: of(
        () => `cardano-${CARDANO_NETWORK_MAGIC.preview}`,
      ),
    },
    wallets: {
      selectActiveNetworkAccountsByBlockchainName$: of(() =>
        Array.from({ length: accountCount }, (_, index) => ({
          accountId: `acc-${index}`,
        })),
      ),
    },
  });

  it('requests the wallet-wide withdrawables read once config + accounts are available', () => {
    const emissions: unknown[] = [];
    makePendingUnstakeRefresh(
      undefined as never,
      state([REALFI_FLAG], 1) as never,
      { actions: { realfiPosition: { withdrawablesRequested } } } as never,
    ).subscribe(action => emissions.push(action));

    expect(emissions).toEqual([{ type: 'withdrawablesRequested' }]);
  });

  it('stays silent without a RealFi config or without accounts', () => {
    const emissions: unknown[] = [];
    makePendingUnstakeRefresh(
      undefined as never,
      state([], 1) as never,
      { actions: { realfiPosition: { withdrawablesRequested } } } as never,
    ).subscribe(action => emissions.push(action));
    makePendingUnstakeRefresh(
      undefined as never,
      state([REALFI_FLAG], 0) as never,
      { actions: { realfiPosition: { withdrawablesRequested } } } as never,
    ).subscribe(action => emissions.push(action));

    expect(emissions).toEqual([]);
  });
});
