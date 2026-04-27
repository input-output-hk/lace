import { describe, expect, it } from 'vitest';

import {
  accountTransactionHistoryTransform,
  MAX_TRANSACTIONS_PER_ACCOUNT,
} from '../../src/store/init';

describe('accountTransactionHistoryTransform', () => {
  it('should return the same state if the key is not accountTransactionHistory', () => {
    const state = {
      account1: {
        address1: {
          transactionHistory: [
            {
              id: 'tx1',
              blockTime: 1746526784980,
            },
          ],
          hasLoadedOldestEntry: false,
        },
      },
    };

    const result = accountTransactionHistoryTransform.in(state, '_persist', {});
    expect(result).toEqual(state);
  });

  it('should return transformed state if the key is accountTransactionHistory', () => {
    const txHistory = Array.from(
      { length: MAX_TRANSACTIONS_PER_ACCOUNT + 1 },
      (_, index) => ({
        id: `tx${index + 1}`,
        blockTime: 1746526784980 - index * 5,
      }),
    );

    const state = {
      account1: {
        address1: {
          transactionHistory: txHistory,
          hasLoadedOldestEntry: false,
        },
        address2: {
          transactionHistory: txHistory.slice(0, MAX_TRANSACTIONS_PER_ACCOUNT),
          hasLoadedOldestEntry: false,
        },
      },
      account2: {
        address1: {
          transactionHistory: txHistory.slice(0, MAX_TRANSACTIONS_PER_ACCOUNT),
          hasLoadedOldestEntry: true,
        },
      },
    };

    const result = accountTransactionHistoryTransform.in(
      state,
      'accountTransactionHistory',
      {},
    );
    expect(result).toEqual({
      account1: {
        address1: {
          transactionHistory: txHistory.slice(0, MAX_TRANSACTIONS_PER_ACCOUNT),
          hasLoadedOldestEntry: false,
        },
        address2: {
          transactionHistory: txHistory.slice(0, MAX_TRANSACTIONS_PER_ACCOUNT),
          hasLoadedOldestEntry: false,
        },
      },
      account2: {
        address1: {
          transactionHistory: txHistory.slice(0, MAX_TRANSACTIONS_PER_ACCOUNT),
          hasLoadedOldestEntry: true,
        },
      },
    });
  });
});
