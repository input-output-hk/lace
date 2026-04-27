import { Cardano } from '@cardano-sdk/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createInputResolver,
  createGetTokenMetadataWrapper,
} from '../../../src/store/helpers/transaction-processors';

import type { TokenId } from '@lace-contract/tokens';
import type { TokenMetadata } from '@lace-contract/tokens';

describe('transaction-processors', () => {
  const testChainId = Cardano.ChainIds.Preprod;
  const testTxIn: Cardano.TxIn = {
    txId: Cardano.TransactionId(
      '7f812e6da32276e76e7e73e7f15248c15ae24e7bb4e2aca1d985e20aaabc6d68',
    ),
    index: 0,
  };
  const testTokenId = 'test-token-id' as TokenId;
  const testTokenMetadata: TokenMetadata = {
    name: 'Test Token',
    decimals: 6,
    blockchainSpecific: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createInputResolver', () => {
    it('should create an input resolver wrapper that calls resolveInput with correct parameters', async () => {
      const mockResolveInput = vi.fn().mockReturnValue(
        of({
          unwrapOr: vi.fn().mockReturnValue({}),
        }),
      );

      const inputResolver = createInputResolver(mockResolveInput, testChainId);

      const result = await inputResolver.resolveInput(testTxIn);

      expect(mockResolveInput).toHaveBeenCalledWith(testTxIn, {
        chainId: testChainId,
      });
      expect(result).toBeDefined();
    });
  });

  describe('createGetTokenMetadataWrapper', () => {
    it('should create a token metadata wrapper that calls getTokenMetadata with correct parameters', () => {
      const mockGetTokenMetadata = vi.fn().mockReturnValue(
        of({
          unwrapOr: vi.fn().mockReturnValue(testTokenMetadata),
        }),
      );

      const wrapper = createGetTokenMetadataWrapper(
        mockGetTokenMetadata,
        testChainId,
      );

      const result$ = wrapper(testTokenId);

      expect(mockGetTokenMetadata).toHaveBeenCalledWith(
        { tokenId: testTokenId },
        { chainId: testChainId },
      );
      expect(result$).toBeDefined();
    });
  });
});
