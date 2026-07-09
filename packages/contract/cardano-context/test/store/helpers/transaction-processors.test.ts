import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { Err, Ok } from '@lace-sdk/util';
import { defer, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  const testTxOut = {} as Cardano.TxOut;
  const retriableError = new ProviderError(ProviderFailure.Unhealthy);
  const nonRetriableError = new ProviderError(ProviderFailure.BadRequest);
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
    it('returns the resolved TxOut on success', async () => {
      const mockResolveInput = vi.fn().mockReturnValue(of(Ok(testTxOut)));

      const inputResolver = createInputResolver(mockResolveInput, testChainId);

      const result = await inputResolver.resolveInput(testTxIn);

      expect(mockResolveInput).toHaveBeenCalledWith(testTxIn, {
        chainId: testChainId,
      });
      expect(result).toBe(testTxOut);
    });

    it('returns null when the provider reports the input does not exist', async () => {
      const mockResolveInput = vi.fn().mockReturnValue(of(Ok(null)));

      const inputResolver = createInputResolver(mockResolveInput, testChainId);

      const result = await inputResolver.resolveInput(testTxIn);

      expect(result).toBeNull();
    });

    describe('with fake timers', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('retries retriable errors and falls back to null after exhaustion', async () => {
        let subscriptions = 0;
        const mockResolveInput = vi.fn().mockImplementation(() =>
          defer(() => {
            subscriptions += 1;
            return of(Err(retriableError));
          }),
        );

        const inputResolver = createInputResolver(
          mockResolveInput,
          testChainId,
        );

        const promise = inputResolver.resolveInput(testTxIn);
        // retryBackoff: 300ms + 600ms + 1200ms = 2100ms
        await vi.advanceTimersByTimeAsync(2100);
        const result = await promise;

        expect(result).toBeNull();
        expect(subscriptions).toBe(4);
      });

      it('recovers and returns TxOut when a retry succeeds', async () => {
        let subscriptions = 0;
        const mockResolveInput = vi.fn().mockImplementation(() =>
          defer(() => {
            subscriptions += 1;
            return subscriptions === 1
              ? of(Err(retriableError))
              : of(Ok(testTxOut));
          }),
        );

        const inputResolver = createInputResolver(
          mockResolveInput,
          testChainId,
        );

        const promise = inputResolver.resolveInput(testTxIn);
        await vi.advanceTimersByTimeAsync(300);
        const result = await promise;

        expect(result).toBe(testTxOut);
        expect(subscriptions).toBe(2);
      });
    });

    it('does not retry non-retriable errors and falls back to null', async () => {
      const mockResolveInput = vi
        .fn()
        .mockReturnValue(of(Err(nonRetriableError)));

      const inputResolver = createInputResolver(mockResolveInput, testChainId);

      const result = await inputResolver.resolveInput(testTxIn);

      expect(result).toBeNull();
      expect(mockResolveInput).toHaveBeenCalledTimes(1);
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
