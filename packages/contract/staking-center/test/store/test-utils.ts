import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-sdk/util';

import type { TxErrorTranslationKeys } from '@lace-contract/tx-executor';
import type { AnyWallet } from '@lace-contract/wallet-repo';

/**
 * Shared test utilities for staking-center store tests.
 * Used by deregistration flow tests (delegation tests use inline fixtures).
 */

// ============================================
// Account and Wallet Fixtures
// ============================================

export const createTestAccountId = (id = 'test-account'): AccountId =>
  AccountId(id);

export const createMockWallet = (accountId: AccountId): AnyWallet =>
  ({
    accounts: [
      {
        accountId,
        blockchainName: 'Cardano',
        metadata: { name: 'Test Account' },
      },
    ],
  } as unknown as AnyWallet);

// ============================================
// Transaction Fixtures
// ============================================

export const TEST_SERIALIZED_TX = 'a100818258...';
export const TEST_TX_ID = 'txId123';
export const TEST_DEPOSIT_RETURN = '2000000';

export const createTestFees = () => [
  { amount: BigNumber(200000n), tokenId: LOVELACE_TOKEN_ID },
];

// ============================================
// Error Translation Keys
// ============================================

export const createDelegationErrorKeys = (): TxErrorTranslationKeys => ({
  title: 'v2.staking.delegation.error.title',
  subtitle: 'v2.staking.delegation.error.subtitle',
});
