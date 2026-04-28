import { Cardano } from '@cardano-sdk/core';
import { createTestScheduler } from '@cardano-sdk/util-dev';
import { TokenId } from '@lace-contract/tokens';
import { Err, Ok, Timestamp } from '@lace-sdk/util';
import { EMPTY } from 'rxjs';
import { describe, it, vi, expect } from 'vitest';

import { fetchAssetsMetadata } from '../../../src/store/helpers/transaction-inspectors';

import type { CardanoTokenMetadata } from '../../../src/types';
import type {
  AssetInfoWithAmount,
  TransactionSummaryInspection,
} from '@cardano-sdk/core';
import type { TokenMetadata } from '@lace-contract/tokens';

describe('fetchAssetsMetadata', () => {
  it('should emit empty map when summary.assets is empty', () => {
    createTestScheduler().run(({ expectObservable }) => {
      const summary: Pick<TransactionSummaryInspection, 'assets'> = {
        assets: new Map<Cardano.AssetId, AssetInfoWithAmount>(),
      };

      const getTokenMetadata = vi.fn(() => EMPTY);

      const result$ = fetchAssetsMetadata(summary, getTokenMetadata);

      expectObservable(result$).toBe('(a|)', {
        a: new Map<Cardano.AssetId, TokenMetadata<CardanoTokenMetadata>>(),
      });
      expect(getTokenMetadata).not.toHaveBeenCalled();
    });
  });

  it('should call getTokenMetadata for each asset and include valid results in emitted map', () => {
    createTestScheduler().run(({ expectObservable, cold }) => {
      const assetId1 = Cardano.AssetId(
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      );
      const assetId2 = Cardano.AssetId(
        '123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
      );

      const summary: Pick<TransactionSummaryInspection, 'assets'> = {
        assets: new Map([
          [assetId1, {} as AssetInfoWithAmount],
          [assetId2, {} as AssetInfoWithAmount],
        ]),
      };

      const mockTokenMetadata1: TokenMetadata<CardanoTokenMetadata> = {
        name: 'Token 1',
        ticker: 'TKN1',
        image: 'logo1.png',
        decimals: 6,
        blockchainSpecific: {
          updatedAt: Timestamp(1719859200000),
        },
      };

      const getTokenMetadata = vi.fn((tokenId: TokenId) => {
        if (tokenId === TokenId(assetId1)) {
          return cold('a|', { a: Ok(mockTokenMetadata1) });
        }
        return cold('a|', { a: Err(new Error('Token not found')) });
      });

      const result$ = fetchAssetsMetadata(summary, getTokenMetadata);

      expectObservable(result$).toBe('-(a|)', {
        a: new Map([[assetId1, mockTokenMetadata1]]),
      });

      // Verify getTokenMetadata was called with correct asset IDs
      expect(getTokenMetadata).toHaveBeenCalledTimes(2);
      expect(getTokenMetadata).toHaveBeenCalledWith(TokenId(assetId1));
      expect(getTokenMetadata).toHaveBeenCalledWith(TokenId(assetId2));
    });
  });
});
