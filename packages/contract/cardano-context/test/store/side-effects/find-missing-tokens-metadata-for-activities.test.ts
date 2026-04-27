import { Milliseconds } from '@cardano-sdk/core';
import { addressesActions } from '@lace-contract/addresses';
import { tokensActions } from '@lace-contract/tokens';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, expect, it } from 'vitest';

import { cardanoContextActions } from '../../../src/store';
import {
  findMissingTokensMetadataForActivities,
  getTokenIdsWithoutMetadata,
} from '../../../src/store/side-effects/find-missing-tokens-metadata-for-activities';

import type { Activity } from '@lace-contract/activities';
import type { MetadataByTokenId, TokenId } from '@lace-contract/tokens';

const actions = {
  ...cardanoContextActions,
  ...addressesActions,
  ...tokensActions,
};

// Mock data
const tokenId1: TokenId = 'token1' as TokenId;
const tokenId2: TokenId = 'token2' as TokenId;
const tokenId3: TokenId = 'token3' as TokenId;

const mockActivity1: Activity = {
  tokenBalanceChanges: [{ tokenId: tokenId1 }, { tokenId: tokenId2 }],
} as Activity;

const mockActivity2: Activity = {
  tokenBalanceChanges: [{ tokenId: tokenId2 }, { tokenId: tokenId3 }],
} as Activity;

const mockActivity3: Activity = {
  tokenBalanceChanges: [{ tokenId: tokenId1 }],
} as Activity;

const mockTokensMetadata: MetadataByTokenId = {
  [tokenId1]: {
    tokenId: tokenId1,
    decimals: 6,
    blockchainSpecific: {},
  },
  // tokenId2 is missing metadata
  // tokenId3 is missing metadata
};

describe('findTokensMissingMetadataInActivities', () => {
  it('should return unique token IDs that are missing metadata', () => {
    const activities = [mockActivity1, mockActivity2];
    const result = getTokenIdsWithoutMetadata(activities, mockTokensMetadata);

    expect(result).toEqual([tokenId2, tokenId3]);
  });

  it('should return empty array when all tokens have metadata', () => {
    const activities = [
      {
        tokenBalanceChanges: [{ tokenId: tokenId1 }],
      } as Activity,
    ];
    const result = getTokenIdsWithoutMetadata(activities, mockTokensMetadata);

    expect(result).toEqual([]);
  });

  it('should return empty array when activities array is empty', () => {
    const activities: Activity[] = [];
    const result = getTokenIdsWithoutMetadata(activities, mockTokensMetadata);

    expect(result).toEqual([]);
  });

  it('should return all missing token IDs when no metadata exists', () => {
    const activities = [mockActivity1];
    const emptyMetadata: MetadataByTokenId = {};
    const result = getTokenIdsWithoutMetadata(activities, emptyMetadata);

    expect(result).toEqual([tokenId1, tokenId2]);
  });
});

describe('cardano-context side effects', () => {
  describe('findMissingTokensMetadataForActivities', () => {
    it('dispatches loadTokenMetadata actions for missing metadata whenever activities change', () => {
      testSideEffect(
        // Debounce effectively disabled
        findMissingTokensMetadataForActivities({ debounce: Milliseconds(0) }),
        ({ hot, expectObservable }) => ({
          actionObservables: {},
          stateObservables: {
            activities: {
              selectAllFlat$: hot<Activity[]>('ab', {
                a: [mockActivity1], // tokenId2 missing metadata
                b: [mockActivity1, mockActivity2], // tokenId3 missing metadata
              }),
            },
            tokens: {
              selectTokensMetadata$: hot<MetadataByTokenId>('a', {
                a: mockTokensMetadata,
              }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a(ab)', {
              a: actions.cardanoContext.loadTokenMetadata({
                tokenId: tokenId2,
              }),
              b: actions.cardanoContext.loadTokenMetadata({
                tokenId: tokenId3,
              }),
            });
          },
        }),
      );
    });

    it('debounces rapid activity updates', () => {
      testSideEffect(
        findMissingTokensMetadataForActivities({ debounce: Milliseconds(10) }),
        ({ hot, expectObservable }) => ({
          actionObservables: {},
          stateObservables: {
            // Emit activities rapidly
            activities: {
              selectAllFlat$: hot<Activity[]>('a-b-c', {
                a: [mockActivity1],
                b: [mockActivity1, mockActivity2],
                c: [mockActivity1, mockActivity2],
              }),
            },
            tokens: {
              selectTokensMetadata$: hot<MetadataByTokenId>('a', {
                a: mockTokensMetadata,
              }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            // Should only emit once after the last emission + debounce time
            expectObservable(sideEffect$).toBe('14ms (ab)', {
              a: actions.cardanoContext.loadTokenMetadata({
                tokenId: tokenId2,
              }),
              b: actions.cardanoContext.loadTokenMetadata({
                tokenId: tokenId3,
              }),
            });
          },
        }),
      );
    });

    it('should not emit any actions when all tokens have metadata', () => {
      testSideEffect(
        findMissingTokensMetadataForActivities({ debounce: Milliseconds(10) }),
        ({ hot, expectObservable }) => ({
          actionObservables: {},
          stateObservables: {
            activities: {
              selectAllFlat$: hot<Activity[]>('a', {
                a: [mockActivity3],
              }),
            },
            tokens: {
              selectTokensMetadata$: hot<MetadataByTokenId>('a', {
                a: mockTokensMetadata,
              }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$, '^ 10ms !').toBe('');
          },
        }),
      );
    });
  });
});
