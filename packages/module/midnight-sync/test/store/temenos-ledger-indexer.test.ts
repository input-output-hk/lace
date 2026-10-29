import {
  DEFAULT_NETWORKS_CONFIG,
  FEATURE_FLAG_MIDNIGHT_INDEXER_URLS,
  MidnightSDKNetworkIds,
} from '@lace-contract/midnight-context';
import {
  initialState,
  midnightContextSelectors,
} from '@lace-contract/midnight-context/src/store/slice';
import { BehaviorSubject } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { createTemenosLedgerIndexerResolver } from '../../src/store/temenos-ledger-indexer';

const resolvedConfig = (preprod?: string) =>
  midnightContextSelectors.midnightContext.selectNetworksConfig({
    midnightContext: initialState,
    features: {
      loaded: {
        modules: [],
        featureFlags: preprod
          ? [{ key: FEATURE_FLAG_MIDNIGHT_INDEXER_URLS, payload: { preprod } }]
          : [],
      },
    },
  });

describe('Temenos ledger indexer resolution', () => {
  it.each([MidnightSDKNetworkIds.Preview, MidnightSDKNetworkIds.MainNet])(
    'uses preprod defaults even when the %s wallet indexer differs',
    async networkId => {
      const config = resolvedConfig();
      expect(config[networkId].indexerAddress).not.toBe(
        config.preprod.indexerAddress,
      );
      const resolve = createTemenosLedgerIndexerResolver(
        new BehaviorSubject(config),
      );
      await expect(resolve()).resolves.toBe(
        DEFAULT_NETWORKS_CONFIG.preprod.indexerAddress,
      );
    },
  );

  it('reads subsequent PostHog changes and preserves authentication parameters', async () => {
    const config$ = new BehaviorSubject(resolvedConfig());
    const resolve = createTemenosLedgerIndexerResolver(config$);
    await expect(resolve()).resolves.toBe(
      DEFAULT_NETWORKS_CONFIG.preprod.indexerAddress,
    );
    const first =
      'https://indexer.example/preprod/graphql?apiKey=first&other=kept';
    config$.next(resolvedConfig(first));
    await expect(resolve()).resolves.toBe(first);
    const second = 'https://indexer.example/preprod/graphql?apiKey=second';
    config$.next(resolvedConfig(second));
    await expect(resolve()).resolves.toBe(second);
  });
});
