import { Cardano } from '@cardano-sdk/core';
import { TokenId } from '@lace-contract/tokens';
import { tokensActions } from '@lace-contract/tokens';
import { testSideEffect } from '@lace-lib/util-dev';
import { BigNumber } from '@lace-sdk/util';
import { describe, it } from 'vitest';

import { LOVELACE_TOKEN_ID } from '../../../src/const';
import { trackAccountTokens } from '../../../src/store/side-effects/track-account-tokens';
import {
  cardanoAccount0Addr,
  cardanoAccount2Addr1,
  cardanoAccount2Addr2,
  threeAccountCardanoWalletAccounts,
} from '../../mocks';

import type {
  AccountRewardAccountDetailsMap,
  AccountUtxoMap,
  CardanoBip32AccountProps,
  CardanoMultiSigAccountProps,
} from '../../../src/types';
import type { AnyAccount } from '@lace-contract/wallet-repo';

type CardanoAccount = AnyAccount<
  CardanoBip32AccountProps,
  CardanoBip32AccountProps,
  CardanoMultiSigAccountProps
>;

const actions = {
  ...tokensActions,
};

const account0 = threeAccountCardanoWalletAccounts[0];
const account2 = threeAccountCardanoWalletAccounts[2];

const assetId = Cardano.AssetId(
  '659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41',
);

describe('trackAccountTokens', () => {
  it('computes and aggregates tokens from multiple utxos across addresses', () => {
    testSideEffect(trackAccountTokens, ({ cold, expectObservable }) => {
      // Account2 has 2 addresses with multiple UTXOs containing coins and assets
      const utxos: Cardano.Utxo[] = [
        // First address: 2 UTXOs
        [
          {
            address: Cardano.PaymentAddress(cardanoAccount2Addr1.address),
            txId: Cardano.TransactionId(
              '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58',
            ),
            index: 0,
          },
          {
            address: Cardano.PaymentAddress(cardanoAccount2Addr1.address),
            value: {
              coins: 3_000_000n,
              assets: new Map([[assetId, 100n]]),
            },
          },
        ],
        [
          {
            address: Cardano.PaymentAddress(cardanoAccount2Addr1.address),
            txId: Cardano.TransactionId(
              '4c4e67bafa15e742c13c592b65c8f74c769cd7d9af04c848099672d1ba391b49',
            ),
            index: 1,
          },
          {
            address: Cardano.PaymentAddress(cardanoAccount2Addr1.address),
            value: {
              coins: 2_000_000n,
              assets: new Map([[assetId, 50n]]),
            },
          },
        ],
        // Second address: 1 UTXO
        [
          {
            address: Cardano.PaymentAddress(cardanoAccount2Addr2.address),
            txId: Cardano.TransactionId(
              '5555555555555555555555555555555555555555555555555555555555555555',
            ),
            index: 0,
          },
          {
            address: Cardano.PaymentAddress(cardanoAccount2Addr2.address),
            value: {
              coins: 1_000_000n,
              assets: new Map(),
            },
          },
        ],
      ];

      const selectActiveCardanoAccounts$ = cold<CardanoAccount[]>('a', {
        a: [account2],
      });

      const selectAccountUtxos$ = cold<AccountUtxoMap>('a', {
        a: { [account2.accountId]: utxos },
      });

      const selectRewardAccountDetails$ = cold<AccountRewardAccountDetailsMap>(
        'a',
        { a: {} },
      );

      return {
        stateObservables: {
          cardanoContext: {
            selectActiveCardanoAccounts$,
            selectAccountUtxos$,
            selectRewardAccountDetails$,
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.tokens.setAccountTokens({
              blockchainName: 'Cardano',
              accountId: account2.accountId,
              byAddress: [
                {
                  address: cardanoAccount2Addr1.address,
                  tokens: [
                    {
                      tokenId: LOVELACE_TOKEN_ID,
                      available: BigNumber(5_000_000n), // 3M + 2M aggregated
                      pending: BigNumber(0n),
                    },
                    {
                      tokenId: TokenId(assetId),
                      available: BigNumber(150n), // 100 + 50 aggregated
                      pending: BigNumber(0n),
                    },
                  ],
                },
                {
                  address: cardanoAccount2Addr2.address,
                  tokens: [
                    {
                      tokenId: LOVELACE_TOKEN_ID,
                      available: BigNumber(1_000_000n),
                      pending: BigNumber(0n),
                    },
                  ],
                },
              ],
            }),
          });
        },
      };
    });
  });

  it('emits new tokens when account utxos change', () => {
    testSideEffect(trackAccountTokens, ({ cold, expectObservable }) => {
      const utxosInitial: Cardano.Utxo[] = [
        [
          {
            address: Cardano.PaymentAddress(cardanoAccount0Addr.address),
            txId: Cardano.TransactionId(
              '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58',
            ),
            index: 0,
          },
          {
            address: Cardano.PaymentAddress(cardanoAccount0Addr.address),
            value: { coins: 5_000_000n, assets: new Map() },
          },
        ],
      ];

      const utxosUpdated: Cardano.Utxo[] = [
        [
          {
            address: Cardano.PaymentAddress(cardanoAccount0Addr.address),
            txId: Cardano.TransactionId(
              '4c4e67bafa15e742c13c592b65c8f74c769cd7d9af04c848099672d1ba391b49',
            ),
            index: 0,
          },
          {
            address: Cardano.PaymentAddress(cardanoAccount0Addr.address),
            value: { coins: 10_000_000n, assets: new Map() },
          },
        ],
      ];

      const selectActiveCardanoAccounts$ = cold<CardanoAccount[]>('a', {
        a: [account0],
      });

      const selectAccountUtxos$ = cold<AccountUtxoMap>('a--b', {
        a: { [account0.accountId]: utxosInitial },
        b: { [account0.accountId]: utxosUpdated },
      });

      const selectRewardAccountDetails$ = cold<AccountRewardAccountDetailsMap>(
        'a',
        { a: {} },
      );

      return {
        stateObservables: {
          cardanoContext: {
            selectActiveCardanoAccounts$,
            selectAccountUtxos$,
            selectRewardAccountDetails$,
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a--b', {
            a: actions.tokens.setAccountTokens({
              blockchainName: 'Cardano',
              accountId: account0.accountId,
              byAddress: [
                {
                  address: cardanoAccount0Addr.address,
                  tokens: [
                    {
                      tokenId: LOVELACE_TOKEN_ID,
                      available: BigNumber(5_000_000n),
                      pending: BigNumber(0n),
                    },
                  ],
                },
              ],
            }),
            b: actions.tokens.setAccountTokens({
              blockchainName: 'Cardano',
              accountId: account0.accountId,
              byAddress: [
                {
                  address: cardanoAccount0Addr.address,
                  tokens: [
                    {
                      tokenId: LOVELACE_TOKEN_ID,
                      available: BigNumber(10_000_000n),
                      pending: BigNumber(0n),
                    },
                  ],
                },
              ],
            }),
          });
        },
      };
    });
  });

  it('includes withdrawable reward amount in ADA for first address', () => {
    testSideEffect(trackAccountTokens, ({ cold, expectObservable }) => {
      const utxos: Cardano.Utxo[] = [
        [
          {
            address: Cardano.PaymentAddress(cardanoAccount0Addr.address),
            txId: Cardano.TransactionId(
              '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58',
            ),
            index: 0,
          },
          {
            address: Cardano.PaymentAddress(cardanoAccount0Addr.address),
            value: { coins: 5_000_000n, assets: new Map() },
          },
        ],
      ];

      const selectActiveCardanoAccounts$ = cold<CardanoAccount[]>('a', {
        a: [account0],
      });

      const selectAccountUtxos$ = cold<AccountUtxoMap>('a', {
        a: { [account0.accountId]: utxos },
      });

      const selectRewardAccountDetails$ = cold<AccountRewardAccountDetailsMap>(
        'a',
        {
          a: {
            [account0.accountId]: {
              rewardAccountInfo: {
                rewardsSum: BigNumber(2_000_000n),
                isActive: true,
                isRegistered: true,
                controlledAmount: BigNumber(10_000_000n),
                withdrawableAmount: BigNumber(2_000_000n), // used for ADA balance
              },
            },
          },
        },
      );

      return {
        stateObservables: {
          cardanoContext: {
            selectActiveCardanoAccounts$,
            selectAccountUtxos$,
            selectRewardAccountDetails$,
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.tokens.setAccountTokens({
              blockchainName: 'Cardano',
              accountId: account0.accountId,
              byAddress: [
                {
                  address: cardanoAccount0Addr.address,
                  tokens: [
                    {
                      tokenId: LOVELACE_TOKEN_ID,
                      available: BigNumber(7_000_000n), // 5M utxo + 2M withdrawable
                      pending: BigNumber(0n),
                    },
                  ],
                },
              ],
            }),
          });
        },
      };
    });
  });

  it('emits empty byAddress when account has no utxos', () => {
    testSideEffect(trackAccountTokens, ({ cold, expectObservable }) => {
      const selectActiveCardanoAccounts$ = cold<CardanoAccount[]>('a', {
        a: [account0],
      });

      const selectAccountUtxos$ = cold<AccountUtxoMap>('a', {
        a: { [account0.accountId]: [] },
      });

      const selectRewardAccountDetails$ = cold<AccountRewardAccountDetailsMap>(
        'a',
        { a: {} },
      );

      return {
        stateObservables: {
          cardanoContext: {
            selectActiveCardanoAccounts$,
            selectAccountUtxos$,
            selectRewardAccountDetails$,
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.tokens.setAccountTokens({
              blockchainName: 'Cardano',
              accountId: account0.accountId,
              byAddress: [],
            }),
          });
        },
      };
    });
  });
});
