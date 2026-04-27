import { beforeEach, describe, expect, it } from 'vitest';

import { TokenId } from '../../src';
import {
  tokensMetadataActions as actions,
  tokensMetadataReducers as reducers,
  tokensMetadataSelectors as selectors,
} from '../../src/store/slice/tokensMetadataSlice';

import type { TokensMetadataState } from '../../src/store/slice';
import type { State } from '@lace-contract/module';

const createStateWithTokensMetadata = (tokensMetadata: TokensMetadataState) =>
  ({
    tokensMetadata: tokensMetadata,
  } as State);

describe('tokensMetadata slice', () => {
  let initialState: TokensMetadataState = {
    byTokenId: {},
  };

  beforeEach(() => {
    initialState = {
      byTokenId: {},
    };
  });

  describe('reducers', () => {
    it('should correctly set tokens metadata for a given blockchain', () => {
      const action = actions.upsertTokensMetadata({
        metadatas: [
          {
            tokenId: TokenId('id-1'),
            name: 'Token Name 1',
            ticker: 'TKN1',
            blockchainSpecific: {},
            decimals: 1,
          },
          {
            tokenId: TokenId('id-2'),
            blockchainSpecific: {},
            name: 'Token Name 2',
            ticker: 'TKN2',
            decimals: 2,
          },
        ],
      });

      const state = reducers.tokensMetadata(initialState, action);

      expect(state).toMatchInlineSnapshot(`
        {
          "byTokenId": {
            "id-1": {
              "blockchainSpecific": {},
              "decimals": 1,
              "name": "Token Name 1",
              "ticker": "TKN1",
              "tokenId": "id-1",
            },
            "id-2": {
              "blockchainSpecific": {},
              "decimals": 2,
              "name": "Token Name 2",
              "ticker": "TKN2",
              "tokenId": "id-2",
            },
          },
        }
      `);
    });

    it('should set new tokens metadata', () => {
      const tokensMetadataState: TokensMetadataState = {
        byTokenId: {
          [TokenId('id-1')]: {
            tokenId: TokenId('id-1'),
            blockchainSpecific: {},
            name: 'Token Name 1',
            decimals: 6,
            ticker: 'TKN1',
          },
          [TokenId('id-2')]: {
            tokenId: TokenId('id-2'),
            blockchainSpecific: {},
            decimals: 7,
            name: 'Token Name 2',
            ticker: 'TKN2',
          },
        },
      };

      const action = actions.upsertTokensMetadata({
        metadatas: [
          {
            tokenId: TokenId('id-new-1'),
            name: 'NEW Token Name 1',
            blockchainSpecific: {},
            ticker: 'NEW1',
            decimals: 3,
          },
          {
            tokenId: TokenId('id-new-2'),
            name: 'NEW Token Name 2',
            blockchainSpecific: {},
            ticker: 'NEW2',
            decimals: 4,
          },
        ],
      });

      const state = reducers.tokensMetadata(tokensMetadataState, action);

      expect(state).toMatchInlineSnapshot(`
        {
          "byTokenId": {
            "id-1": {
              "blockchainSpecific": {},
              "decimals": 6,
              "name": "Token Name 1",
              "ticker": "TKN1",
              "tokenId": "id-1",
            },
            "id-2": {
              "blockchainSpecific": {},
              "decimals": 7,
              "name": "Token Name 2",
              "ticker": "TKN2",
              "tokenId": "id-2",
            },
            "id-new-1": {
              "blockchainSpecific": {},
              "decimals": 3,
              "name": "NEW Token Name 1",
              "ticker": "NEW1",
              "tokenId": "id-new-1",
            },
            "id-new-2": {
              "blockchainSpecific": {},
              "decimals": 4,
              "name": "NEW Token Name 2",
              "ticker": "NEW2",
              "tokenId": "id-new-2",
            },
          },
        }
      `);
    });

    it('should correctly set token metadata for a given blockchain', () => {
      const action = actions.upsertTokenMetadata({
        tokenId: TokenId('id-1'),
        name: 'Token Name 1',
        ticker: 'TKN1',
        blockchainSpecific: {},
        decimals: 1,
      });

      const state = reducers.tokensMetadata(initialState, action);

      expect(state).toMatchInlineSnapshot(`
        {
          "byTokenId": {
            "id-1": {
              "blockchainSpecific": {},
              "decimals": 1,
              "name": "Token Name 1",
              "ticker": "TKN1",
              "tokenId": "id-1",
            },
          },
        }
      `);
    });

    it('should set new token metadata', () => {
      const tokensMetadataState: TokensMetadataState = {
        byTokenId: {
          [TokenId('id-1')]: {
            tokenId: TokenId('id-1'),
            blockchainSpecific: {},
            name: 'Token Name 1',
            decimals: 6,
            ticker: 'TKN1',
          },
          [TokenId('id-2')]: {
            tokenId: TokenId('id-2'),
            blockchainSpecific: {},
            decimals: 7,
            name: 'Token Name 2',
            ticker: 'TKN2',
          },
        },
      };

      const action = actions.upsertTokenMetadata({
        tokenId: TokenId('id-new-1'),
        name: 'NEW Token Name 1',
        blockchainSpecific: {},
        ticker: 'NEW1',
        decimals: 3,
      });

      const state = reducers.tokensMetadata(tokensMetadataState, action);

      expect(state).toMatchInlineSnapshot(`
        {
          "byTokenId": {
            "id-1": {
              "blockchainSpecific": {},
              "decimals": 6,
              "name": "Token Name 1",
              "ticker": "TKN1",
              "tokenId": "id-1",
            },
            "id-2": {
              "blockchainSpecific": {},
              "decimals": 7,
              "name": "Token Name 2",
              "ticker": "TKN2",
              "tokenId": "id-2",
            },
            "id-new-1": {
              "blockchainSpecific": {},
              "decimals": 3,
              "name": "NEW Token Name 1",
              "ticker": "NEW1",
              "tokenId": "id-new-1",
            },
          },
        }
      `);
    });
  });

  describe('selectors', () => {
    it('should correctly select tokens metadata', () => {
      const state: TokensMetadataState = {
        byTokenId: {
          [TokenId('id-new-1')]: {
            tokenId: TokenId('id-new-1'),
            name: 'NEW Token Name 1',
            blockchainSpecific: {},
            ticker: 'NEW1',
            decimals: 5,
          },
          [TokenId('id-new-2')]: {
            decimals: 8,
            tokenId: TokenId('id-new-2'),
            blockchainSpecific: {},
            name: 'NEW Token Name 2',
            ticker: 'NEW2',
          },
          [TokenId('midnight-id-new-1')]: {
            decimals: 9,
            tokenId: TokenId('midnight-id-new-1'),
            blockchainSpecific: {},
            name: 'Midnight Token Name 1',
            ticker: 'NEW1',
          },
        },
      };

      expect(
        selectors.selectTokensMetadata(createStateWithTokensMetadata(state)),
      ).toMatchInlineSnapshot(`
        {
          "id-new-1": {
            "blockchainSpecific": {},
            "decimals": 5,
            "name": "NEW Token Name 1",
            "ticker": "NEW1",
            "tokenId": "id-new-1",
          },
          "id-new-2": {
            "blockchainSpecific": {},
            "decimals": 8,
            "name": "NEW Token Name 2",
            "ticker": "NEW2",
            "tokenId": "id-new-2",
          },
          "midnight-id-new-1": {
            "blockchainSpecific": {},
            "decimals": 9,
            "name": "Midnight Token Name 1",
            "ticker": "NEW1",
            "tokenId": "midnight-id-new-1",
          },
        }
      `);
    });
  });
});
