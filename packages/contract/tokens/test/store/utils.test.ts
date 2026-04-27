import { AccountId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import {
  getTokensOfAccount,
  getTokensOfBlockchain,
} from '../../src/store/slice/utils';

import {
  cardanoAdaToken,
  cardanoOtherToken,
  midnightToken,
} from './mock-tokens';

import type { Token } from '../../src';

// Mock account tokens

const firstAccountId = AccountId('wallet-0');
const secondAccountId = AccountId('wallet-1');

const cardanoAdaTokenAccount1 = {
  ...cardanoAdaToken,
  accountId: firstAccountId,
} satisfies Token;

const cardanoOtherTokenAccount1 = {
  ...cardanoOtherToken,
  accountId: firstAccountId,
} satisfies Token;

const cardanoAdaTokenAccount2 = {
  ...cardanoAdaToken,
  accountId: secondAccountId,
} satisfies Token;

const tokens: Token[] = [
  cardanoAdaTokenAccount1,
  cardanoOtherTokenAccount1,
  cardanoAdaTokenAccount2,
  midnightToken,
];

describe('tokens store utils', () => {
  describe('picking specific tokens', () => {
    it('should select all account tokens', () => {
      expect(getTokensOfAccount(tokens, firstAccountId)).toEqual([
        cardanoAdaTokenAccount1,
        cardanoOtherTokenAccount1,
      ]);
      expect(getTokensOfAccount(tokens, secondAccountId)).toEqual([
        cardanoAdaTokenAccount2,
      ]);
    });

    it('should select all blockchain tokens', () => {
      expect(getTokensOfBlockchain(tokens, 'Cardano')).toEqual([
        cardanoAdaTokenAccount1,
        cardanoOtherTokenAccount1,
        cardanoAdaTokenAccount2,
      ]);
      expect(getTokensOfBlockchain(tokens, 'Midnight')).toEqual([
        midnightToken,
      ]);
    });
  });
});
