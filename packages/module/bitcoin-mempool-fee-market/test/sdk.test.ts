import {
  BITCOIN_FEATURE_FLAG,
  BITCOIN_MEMPOOL_FEE_MARKET_FEATURE_FLAG,
  bitcoinFeeMarketProvider,
} from '@lace-contract/bitcoin-context';
import { describe, expect, it } from 'vitest';

import sdkModule from '../src/sdk';

const willLoad = (...keys: string[]) =>
  sdkModule.feature?.willLoad(keys.map(key => ({ key })) as never, {} as never);

describe('bitcoin-mempool-fee-market sdk module', () => {
  it('is named bitcoin-mempool-fee-market', () => {
    expect(sdkModule.moduleName).toBe('bitcoin-mempool-fee-market');
  });

  it('loads only when the mempool fee market feature flag is present', () => {
    expect(willLoad(BITCOIN_MEMPOOL_FEE_MARKET_FEATURE_FLAG)).toBe(true);
    expect(willLoad(BITCOIN_FEATURE_FLAG)).toBe(false);
  });

  it('implements the fee market provider and nothing else', () => {
    expect(sdkModule.implements?.contracts.map(({ name }) => name)).toEqual([
      bitcoinFeeMarketProvider.name,
    ]);
    expect(sdkModule.dependsOn?.contracts).toEqual([]);
    expect(Object.keys(sdkModule.addons)).toEqual([]);
  });
});
