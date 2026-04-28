import { midnightContextActions } from '@lace-contract/midnight-context';
import { BehaviorSubject, firstValueFrom, take, toArray } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchNetworkTermsAndConditions } from '../../../src/store/side-effects';
import { midnightActions } from '../../../src/store/slice';

import type { MidnightNetworkConfig } from '@lace-contract/midnight-context';
import type { Action } from '@reduxjs/toolkit';

const { fetchTermsAndConditionsMock } = vi.hoisted(() => ({
  fetchTermsAndConditionsMock: vi.fn(),
}));

vi.mock('@midnight-ntwrk/wallet-sdk-facade', () => ({
  WalletFacade: {
    fetchTermsAndConditions: fetchTermsAndConditionsMock,
  },
}));

const actions = { ...midnightActions, ...midnightContextActions };

const testNetworkConfig: MidnightNetworkConfig = {
  nodeAddress: 'http://node.example.com',
  indexerAddress: 'http://indexer.example.com',
  proofServerAddress: 'http://proof-server.example.com',
};

describe('fetchNetworkTermsAndConditions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should dispatch setNetworkTermsAndConditions on successful fetch', async () => {
    const termsAndConditions = {
      url: 'https://midnight.network/terms',
      hash: 'abc123',
    };
    fetchTermsAndConditionsMock.mockResolvedValue(termsAndConditions);

    const selectCurrentNetwork$ = new BehaviorSubject({
      networkId: 'preview',
      config: testNetworkConfig,
    });

    const sideEffect$ = fetchNetworkTermsAndConditions(
      {} as never,
      { midnightContext: { selectCurrentNetwork$ } } as never,
      { actions, logger: dummyLogger } as never,
    );

    const result = await firstValueFrom(sideEffect$);

    expect(result).toEqual(
      actions.midnightContext.setNetworkTermsAndConditions(termsAndConditions),
    );
    expect(fetchTermsAndConditionsMock).toHaveBeenCalledWith({
      indexerClientConnection: {
        indexerHttpUrl: testNetworkConfig.indexerAddress,
        indexerWsUrl: 'ws://indexer.example.com/ws',
      },
    });
  });

  it('should dispatch setNetworkTermsAndConditions(undefined) on fetch failure', async () => {
    fetchTermsAndConditionsMock.mockRejectedValue(new Error('Network error'));

    const selectCurrentNetwork$ = new BehaviorSubject({
      networkId: 'preview',
      config: testNetworkConfig,
    });

    const sideEffect$ = fetchNetworkTermsAndConditions(
      {} as never,
      { midnightContext: { selectCurrentNetwork$ } } as never,
      { actions, logger: dummyLogger } as never,
    );

    const result = await firstValueFrom(sideEffect$);

    expect(result).toEqual(
      actions.midnightContext.setNetworkTermsAndConditions(undefined),
    );
  });

  it('should re-fetch when network config changes', async () => {
    const termsForNetwork1 = {
      url: 'https://midnight.network/terms-preview',
      hash: 'hash1',
    };
    const termsForNetwork2 = {
      url: 'https://midnight.network/terms-mainnet',
      hash: 'hash2',
    };

    fetchTermsAndConditionsMock
      .mockResolvedValueOnce(termsForNetwork1)
      .mockResolvedValueOnce(termsForNetwork2);

    const network2Config: MidnightNetworkConfig = {
      nodeAddress: 'http://node2.example.com',
      indexerAddress: 'http://indexer2.example.com',
      proofServerAddress: 'http://proof-server2.example.com',
    };

    const selectCurrentNetwork$ = new BehaviorSubject({
      networkId: 'preview',
      config: testNetworkConfig,
    });

    const sideEffect$ = fetchNetworkTermsAndConditions(
      {} as never,
      { midnightContext: { selectCurrentNetwork$ } } as never,
      { actions, logger: dummyLogger } as never,
    );

    const resultPromise = firstValueFrom(sideEffect$.pipe(take(2), toArray()));

    // Wait a tick for the first fetch to resolve, then switch network
    await new Promise(resolve => setTimeout(resolve, 0));
    selectCurrentNetwork$.next({
      networkId: 'mainnet',
      config: network2Config,
    });

    const results = (await resultPromise) as Action[];

    expect(results).toEqual([
      actions.midnightContext.setNetworkTermsAndConditions(termsForNetwork1),
      actions.midnightContext.setNetworkTermsAndConditions(termsForNetwork2),
    ]);
    expect(fetchTermsAndConditionsMock).toHaveBeenCalledTimes(2);
  });

  it('should not re-fetch when network config is identical', async () => {
    const termsAndConditions = {
      url: 'https://midnight.network/terms',
      hash: 'abc123',
    };
    fetchTermsAndConditionsMock.mockResolvedValue(termsAndConditions);

    const selectCurrentNetwork$ = new BehaviorSubject({
      networkId: 'preview',
      config: testNetworkConfig,
    });

    const sideEffect$ = fetchNetworkTermsAndConditions(
      {} as never,
      { midnightContext: { selectCurrentNetwork$ } } as never,
      { actions, logger: dummyLogger } as never,
    );

    const result = await firstValueFrom(sideEffect$);

    // Re-emit the same value
    selectCurrentNetwork$.next({
      networkId: 'preview',
      config: testNetworkConfig,
    });

    // Wait a tick to allow any extra fetch to happen
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(result).toEqual(
      actions.midnightContext.setNetworkTermsAndConditions(termsAndConditions),
    );
    expect(fetchTermsAndConditionsMock).toHaveBeenCalledTimes(1);
  });
});
