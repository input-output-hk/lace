import { Cardano, Serialization } from '@cardano-sdk/core';
import { Hash32ByteBase16 } from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import { TokenId, tokensActions } from '@lace-contract/tokens';
import { classifyCustodyAccountUtxos } from '@lace-lib/cardano-custody';
import { BigNumber } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import { CardanoPaymentAddress } from '../../src';
import { LOVELACE_TOKEN_ID } from '../../src/const';
import { trackCustodyAccountTokens } from '../../src/custody/store/track-custody-account-tokens';
import {
  cardanoCustodyAccount,
  controlUtxo,
  custodyAddress,
  custodyGrant,
  custodyLovelaceScope,
  custodyState,
  custodyUtxo,
  grantUtxo,
} from '../custody-mocks';
import { threeAccountCardanoWalletAccounts } from '../mocks';

import type { CardanoCustodyAccountState } from '../../src';
import type {
  AccountRewardAccountDetailsMap,
  CardanoBip32AccountProps,
  CardanoCustodyAccountProps,
  CardanoMultiSigAccountProps,
} from '../../src/types';
import type { AccountId, AnyAccount } from '@lace-contract/wallet-repo';

type CardanoAccount = AnyAccount<
  CardanoBip32AccountProps,
  CardanoBip32AccountProps,
  CardanoMultiSigAccountProps,
  CardanoCustodyAccountProps
>;

const actions = { ...tokensActions };

type AccountTokensByAddress = Parameters<
  typeof actions.tokens.setAccountTokens
>[0]['byAddress'];

const assetId = Cardano.AssetId(
  '659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41',
);

describe('trackCustodyAccountTokens', () => {
  const custodyAccountId = cardanoCustodyAccount.accountId;
  const control = controlUtxo(1);
  const fund = custodyUtxo(2, {
    value: { coins: 4_000_000n, assets: new Map([[assetId, 3n]]) },
  });
  const otherFund = custodyUtxo(3, { coins: 1_000_000n });
  const referenceScriptFund = custodyUtxo(9, {
    value: { coins: 6_000_000n, assets: new Map([[assetId, 4n]]) },
    scriptReference: {
      __type: Cardano.ScriptType.Native,
      kind: Cardano.NativeScriptKind.RequireAnyOf,
      scripts: [],
    },
  });
  const stranded = custodyUtxo(4, {
    coins: 9_000_000n,
    datumHash: Hash32ByteBase16('dd'.repeat(32)),
  });
  const ownReserve = custodyUtxo(6, {
    coins: 2_000_000n,
    datum: Serialization.PlutusData.fromCbor(HexBlob('d87980')).toCore(),
  });
  const foreignReserve = custodyUtxo(7, {
    value: { coins: 1_500_000n, assets: new Map([[assetId, 2n]]) },
    datum: 42n,
  });
  const grant = grantUtxo(
    8,
    custodyGrant(0n, 'a1', custodyLovelaceScope(1_800_000_000_000n)),
    3_000_000n,
  );

  const holdings = {
    funds: [fund, otherFund, referenceScriptFund],
    reserves: { own: [ownReserve], foreign: [foreignReserve] },
    grants: classifyCustodyAccountUtxos(
      cardanoCustodyAccount.blockchainSpecific,
      [grant],
    ).grants,
    grantLockedLovelace: 3_000_000n,
    stranded: [stranded],
    anomalies: [],
    withdrawableRewards: 500_000n,
  };
  const live: CardanoCustodyAccountState = {
    ...holdings,
    status: 'live',
    controlUtxo: control,
    state: custodyState,
    controlMinimumLovelace: 1_586_080n,
    controlHeadroomLovelace: 1_413_920n,
    currentDeviceListed: true,
  };

  const custodyTokens = (byAddress: AccountTokensByAddress) =>
    actions.tokens.setAccountTokens({
      blockchainName: 'Cardano',
      accountId: custodyAccountId,
      byAddress,
    });
  const liveCustodyTokens = custodyTokens([
    {
      address: CardanoPaymentAddress(custodyAddress),
      tokens: [
        {
          tokenId: LOVELACE_TOKEN_ID,
          available: BigNumber(7_500_000n),
          pending: BigNumber(0n),
        },
        {
          tokenId: TokenId(assetId),
          available: BigNumber(3n),
          pending: BigNumber(0n),
        },
      ],
    },
  ]);

  it('counts plain funds without a reference script, own reserves and withdrawable rewards, never foreign reserves, the control or grant lovelace, stranded deposits or account tokens', () => {
    testSideEffect(trackCustodyAccountTokens, ({ cold, expectObservable }) => ({
      stateObservables: {
        cardanoContext: {
          selectActiveCardanoAccounts$: cold<CardanoAccount[]>('a', {
            a: [cardanoCustodyAccount],
          }),
          selectRewardAccountDetailsWithInFlight$:
            cold<AccountRewardAccountDetailsMap>('a', { a: {} }),
        },
        cardanoCustody: {
          selectCardanoCustodyAccountState$: cold('a', {
            a: (accountId: AccountId) =>
              accountId === custodyAccountId ? live : undefined,
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', { a: liveCustodyTokens });
      },
    }));
  });

  it('leaves out rewards a pending custody withdrawal already moved into its outputs', () => {
    testSideEffect(trackCustodyAccountTokens, ({ cold, expectObservable }) => ({
      stateObservables: {
        cardanoContext: {
          selectActiveCardanoAccounts$: cold<CardanoAccount[]>('a', {
            a: [cardanoCustodyAccount],
          }),
          // The classified state keeps the raw 0.5 ADA; the balance view
          // has none left, a pending transaction withdrew it.
          selectRewardAccountDetailsWithInFlight$:
            cold<AccountRewardAccountDetailsMap>('a', {
              a: {
                [custodyAccountId]: {
                  rewardAccountInfo: {
                    rewardsSum: BigNumber(500_000n),
                    isActive: true,
                    isRegistered: true,
                    controlledAmount: BigNumber(0n),
                    withdrawableAmount: BigNumber(0n),
                  },
                },
              },
            }),
        },
        cardanoCustody: {
          selectCardanoCustodyAccountState$: cold('a', {
            a: (accountId: AccountId) =>
              accountId === custodyAccountId ? live : undefined,
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', {
          a: custodyTokens([
            {
              address: CardanoPaymentAddress(custodyAddress),
              tokens: [
                {
                  tokenId: LOVELACE_TOKEN_ID,
                  available: BigNumber(7_000_000n),
                  pending: BigNumber(0n),
                },
                {
                  tokenId: TokenId(assetId),
                  available: BigNumber(3n),
                  pending: BigNumber(0n),
                },
              ],
            },
          ]),
        });
      },
    }));
  });

  it('holds nothing spendable while the account is not created, invalid or not yet synced', () => {
    testSideEffect(trackCustodyAccountTokens, ({ cold, expectObservable }) => {
      const notCreated: CardanoCustodyAccountState = {
        ...holdings,
        status: 'notCreated',
      };
      const invalid: CardanoCustodyAccountState = {
        ...holdings,
        status: 'invalid',
        reason: { code: 'multiple-control-utxos' },
        controlUtxos: [control, controlUtxo(5)],
      };
      return {
        stateObservables: {
          cardanoContext: {
            selectActiveCardanoAccounts$: cold<CardanoAccount[]>('a', {
              a: [cardanoCustodyAccount],
            }),
            selectRewardAccountDetailsWithInFlight$:
              cold<AccountRewardAccountDetailsMap>('a', { a: {} }),
          },
          cardanoCustody: {
            selectCardanoCustodyAccountState$: cold('abcd', {
              a: () => undefined,
              b: () => notCreated,
              c: () => invalid,
              d: () => live,
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('abcd', {
            a: custodyTokens([]),
            b: custodyTokens([]),
            c: custodyTokens([]),
            d: liveCustodyTokens,
          });
        },
      };
    });
  });

  it('emits again only when the classification changes', () => {
    testSideEffect(trackCustodyAccountTokens, ({ cold, expectObservable }) => {
      const notCreated: CardanoCustodyAccountState = {
        ...holdings,
        status: 'notCreated',
      };
      return {
        stateObservables: {
          cardanoContext: {
            selectActiveCardanoAccounts$: cold<CardanoAccount[]>('a', {
              a: [cardanoCustodyAccount],
            }),
            selectRewardAccountDetailsWithInFlight$:
              cold<AccountRewardAccountDetailsMap>('a', { a: {} }),
          },
          cardanoCustody: {
            selectCardanoCustodyAccountState$: cold('ab', {
              a: () => notCreated,
              b: () => notCreated,
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', { a: custodyTokens([]) });
        },
      };
    });
  });

  it('leaves key accounts to the Cardano context', () => {
    testSideEffect(trackCustodyAccountTokens, ({ cold, expectObservable }) => ({
      stateObservables: {
        cardanoContext: {
          selectActiveCardanoAccounts$: cold<CardanoAccount[]>('a', {
            a: [threeAccountCardanoWalletAccounts[0], cardanoCustodyAccount],
          }),
          selectRewardAccountDetailsWithInFlight$:
            cold<AccountRewardAccountDetailsMap>('a', { a: {} }),
        },
        cardanoCustody: {
          selectCardanoCustodyAccountState$: cold('a', { a: () => live }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', { a: liveCustodyTokens });
      },
    }));
  });
});
