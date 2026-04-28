import { Percent } from '@cardano-sdk/util';
import {
  MidnightDustAddress,
  MidnightShieldedAddress,
  MidnightUnshieldedAddress,
  NIGHT_TOKEN_ID,
} from '@lace-contract/midnight-context';
import { BigNumber } from '@lace-sdk/util';
import { BehaviorSubject, NEVER, of } from 'rxjs';

import type {
  MidnightSideEffectsDependencies,
  MidnightWallet,
  StartMidnightAccountWalletParams,
  MidnightAccountId,
} from '@lace-contract/midnight-context';

// Stub addresses for tests - same as in setup-actions.ts
const stubShieldedAddress = MidnightShieldedAddress(
  'mn_shield-addr_preview1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sxqpvzkdy4k9u7eyffff53cge62tqylevq3wqps86tdjuahsquwvucssaxhfq',
);
const stubUnshieldedAddress = MidnightUnshieldedAddress(
  'mn_addr_preview1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0spkgx9l',
);
const stubDustAddress = MidnightDustAddress(
  'mn_dust-addr_preview1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0spkgx9l',
);

/**
 * Stub Midnight wallet for integration tests.
 * Does not require authentication to start.
 */
export const createStubMidnightWallet = (
  params: StartMidnightAccountWalletParams,
): MidnightWallet => ({
  accountId: params.account.accountId as MidnightAccountId,
  networkId: params.account.blockchainSpecific.networkId,
  nightVerifyingKey: 'stubPublicKey', // stub public key
  walletId: params.account.walletId,

  // Use BehaviorSubject for observables consumed with withLatestFrom
  // (of() completes synchronously before isUnshieldedEnabled$ emits)
  address$: new BehaviorSubject({
    shielded: stubShieldedAddress,
    unshielded: stubUnshieldedAddress,
    dust: stubDustAddress,
  }),

  areKeysAvailable$: new BehaviorSubject(false),

  coinsByTokenType$: new BehaviorSubject({
    shielded: {
      // NIGHT token with 1 million available
      [NIGHT_TOKEN_ID]: [
        {
          status: 'available' as const,
          value: BigNumber(1_000_000n),
        },
      ],
    },
    unshielded: {},
  }),

  syncProgress$: new BehaviorSubject({
    dust: Percent(1),
    shielded: Percent(1),
    unshielded: Percent(1),
    isStrictlyComplete: {
      dust: true,
      shielded: true,
      unshielded: true,
    },
  }),

  transactionHistory$: of([]),

  balanceFinalizedTransaction: () => NEVER,
  balanceUnboundTransaction: () => NEVER,
  balanceUnprovenTransaction: () => NEVER,
  initSwap: () => NEVER,
  finalizeRecipe: () => NEVER,
  calculateTransactionFee: () => NEVER,
  estimateTransactionFee: () => NEVER,
  deregisterFromDustGeneration: () => NEVER,
  finalizeTransaction: () => NEVER,
  getTransactionHistoryEntryByHash: () => of(undefined),
  registerNightUtxosForDustGeneration: () => NEVER,
  signRecipe: () => NEVER,
  signUnprovenTransaction: () => NEVER,
  signData: () => NEVER,
  state: () => NEVER,
  stop: () => of(undefined),
  submitTransaction: () => NEVER,
  transferTransaction: () => NEVER,
});

/**
 * Stub for startMidnightAccountWallet that returns a mock wallet
 * without requiring authentication.
 */
export const stubStartMidnightAccountWallet: MidnightSideEffectsDependencies['startMidnightAccountWallet'] =
  params => of(createStubMidnightWallet(params));
