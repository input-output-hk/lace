import { Cardano } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { ActivityType } from '@lace-contract/activities';
import { WalletType } from '@lace-contract/wallet-repo';
import { BigNumber, Timestamp } from '@lace-lib/util';
import { Serializable } from '@lace-lib/util-store';
import { describe, expect, it } from 'vitest';

import { CardanoNetworkId } from '../../src';
import { cardanoCustodySelectors as custodySelectors } from '../../src/custody/store';
import {
  cardanoContextActions as actions,
  cardanoContextReducers as reducers,
  cardanoContextSelectors as selectors,
} from '../../src/store/slice';
import {
  cardanoCustodyAccount,
  controlUtxo,
  custodyAddress,
  custodyProtocolParameters,
  custodyState,
  custodyUtxo,
  foreignPaymentAddress,
  otherDeviceKeyHash,
} from '../custody-mocks';
import {
  cardanoAccount0Addr,
  threeAccountCardanoWallet,
  threeAccountCardanoWalletAccounts,
  utxo1,
} from '../mocks';

import type {
  CardanoContextSliceState,
  RequiredProtocolParameters,
} from '../../src';
import type { Activity } from '@lace-contract/activities';
import type { WalletEntity } from '@lace-contract/wallet-repo';

type RootState = Parameters<
  typeof custodySelectors.cardanoCustody.selectCardanoCustodyAccountState
>[0];

const custodyAccountId = cardanoCustodyAccount.accountId;
const keyAccountId = threeAccountCardanoWalletAccounts[0].accountId;

const custodyWallet = {
  walletId: cardanoCustodyAccount.walletId,
  type: WalletType.CardanoCustody,
  metadata: { name: 'custody', order: 2 },
  blockchainSpecific: {},
  accounts: [cardanoCustodyAccount],
} as unknown as WalletEntity;

const emptyCardanoContext: CardanoContextSliceState = {
  accountTransactionHistory: {},
  accountRewardsHistory: {},
  networkInfo: {},
  accountUtxos: {},
  accountUnspendableUtxos: {},
  rewardAccountDetails: {},
  lastFetchedRewardAccountDetailsCacheKey: {},
  accountDelegationsHistory: {},
  delegationActivities: {},
  securityScanByAccount: {},
  securityScanInProgress: {},
  securityRescanDismissedByAccount: {},
};

const fund = custodyUtxo(10, { coins: 5_000_000n });

const pendingActivity = (metadata: {
  consumedInputs: Cardano.TxIn[];
  producedOutputs: Cardano.Utxo[];
}): Activity => ({
  accountId: custodyAccountId,
  activityId: 'pending-custody-operation',
  timestamp: Timestamp(0),
  tokenBalanceChanges: [],
  type: ActivityType.Pending,
  blockchainSpecific: Serializable.to({ Cardano: metadata }) as unknown,
});

const buildState = ({
  wallets = [threeAccountCardanoWallet as WalletEntity, custodyWallet],
  custodyUtxos,
  keyUtxos = [utxo1],
  withdrawable,
  activities = {},
  protocolParametersNetwork = Cardano.NetworkMagics.Preprod,
}: {
  wallets?: WalletEntity[];
  custodyUtxos?: Cardano.Utxo[];
  keyUtxos?: Cardano.Utxo[];
  withdrawable?: bigint;
  activities?: Record<string, Activity[]>;
  /** The network whose protocol parameters are known; `null` for none. */
  protocolParametersNetwork?: Cardano.NetworkMagics | null;
} = {}): RootState => {
  let cardanoContext = reducers.cardanoContext(
    emptyCardanoContext,
    actions.cardanoContext.setAccountUtxos({
      accountId: keyAccountId,
      utxos: keyUtxos,
    }),
  );
  if (protocolParametersNetwork !== null) {
    cardanoContext = reducers.cardanoContext(
      cardanoContext,
      actions.cardanoContext.setProtocolParameters({
        network: CardanoNetworkId(protocolParametersNetwork),
        protocolParameters:
          custodyProtocolParameters as RequiredProtocolParameters,
      }),
    );
  }
  if (custodyUtxos) {
    cardanoContext = reducers.cardanoContext(
      cardanoContext,
      actions.cardanoContext.setAccountUtxos({
        accountId: custodyAccountId,
        utxos: custodyUtxos,
      }),
    );
  }
  if (withdrawable !== undefined) {
    cardanoContext = reducers.cardanoContext(
      cardanoContext,
      actions.cardanoContext.setRewardAccountDetails({
        accountId: custodyAccountId,
        details: {
          rewardAccountInfo: {
            isActive: true,
            isRegistered: true,
            rewardsSum: BigNumber(withdrawable),
            controlledAmount: BigNumber(withdrawable),
            withdrawableAmount: BigNumber(withdrawable),
          },
        },
      }),
    );
  }
  return {
    cardanoContext,
    activities: {
      activities,
      desiredLoadedActivitiesCountPerAccount: {},
      hasLoadedOldestEntry: {},
    },
    addresses: {
      addresses: [
        cardanoAccount0Addr,
        {
          name: 'custody',
          address: custodyAddress,
          blockchainName: 'Cardano',
          accountId: custodyAccountId,
        },
      ],
    },
    wallets: {
      ids: wallets.map(wallet => wallet.walletId),
      entities: Object.fromEntries(
        wallets.map(wallet => [wallet.walletId, wallet]),
      ),
    },
  } as unknown as RootState;
};

describe('custody selectors', () => {
  describe('selectCardanoCustodyAccountState', () => {
    const { selectCardanoCustodyAccountState } =
      custodySelectors.cardanoCustody;

    it('classifies a custody account from its UTxOs, withdrawable rewards and network parameters', () => {
      const control = controlUtxo(1);
      const state = buildState({
        custodyUtxos: [control, fund],
        withdrawable: 7_000n,
      });

      expect(selectCardanoCustodyAccountState(state, custodyAccountId)).toEqual(
        {
          status: 'live',
          controlUtxo: control,
          state: custodyState,
          controlMinimumLovelace: 1_586_080n,
          controlHeadroomLovelace: 1_413_920n,
          currentDeviceListed: true,
          funds: [fund],
          reserves: { own: [], foreign: [] },
          grants: [],
          grantLockedLovelace: 0n,
          stranded: [],
          anomalies: [],
          withdrawableRewards: 7_000n,
        },
      );
    });

    it('is undefined until the protocol parameters of the account network are known', () => {
      const custodyUtxos = [controlUtxo(1), fund];

      expect(
        selectCardanoCustodyAccountState(
          buildState({ custodyUtxos, protocolParametersNetwork: null }),
          custodyAccountId,
        ),
      ).toBeUndefined();
      expect(
        selectCardanoCustodyAccountState(
          buildState({
            custodyUtxos,
            protocolParametersNetwork: Cardano.NetworkMagics.Mainnet,
          }),
          custodyAccountId,
        ),
      ).toBeUndefined();
    });

    it('reports no withdrawable rewards before the reward account is fetched', () => {
      const state = buildState({ custodyUtxos: [controlUtxo(1)] });

      expect(
        selectCardanoCustodyAccountState(state, custodyAccountId)
          ?.withdrawableRewards,
      ).toBe(0n);
    });

    it('is undefined before the first UTxO fetch lands', () => {
      expect(
        selectCardanoCustodyAccountState(buildState(), custodyAccountId),
      ).toBeUndefined();
    });

    it('is undefined for an account whose stored address is not the one its identity derives', () => {
      const tampered = {
        ...cardanoCustodyAccount,
        blockchainSpecific: {
          ...cardanoCustodyAccount.blockchainSpecific,
          address: foreignPaymentAddress,
        },
      };
      const state = buildState({
        wallets: [
          threeAccountCardanoWallet as WalletEntity,
          { ...custodyWallet, accounts: [tampered] } as WalletEntity,
        ],
        custodyUtxos: [
          controlUtxo(1),
          custodyUtxo(10, { address: foreignPaymentAddress }),
        ],
      });

      expect(
        selectCardanoCustodyAccountState(state, custodyAccountId),
      ).toBeUndefined();
    });

    it('is undefined for an account that is not a custody account', () => {
      expect(
        selectCardanoCustodyAccountState(
          buildState({ custodyUtxos: [controlUtxo(1)] }),
          keyAccountId,
        ),
      ).toBeUndefined();
    });

    it('reads the in-flight view: a pending operation replaces the spent control UTxO at once', () => {
      const spent = controlUtxo(1);
      const nextState = {
        ...custodyState,
        devices: [...custodyState.devices, HexBlob(otherDeviceKeyHash)],
      };
      const next = controlUtxo(2, nextState);
      const state = buildState({
        custodyUtxos: [spent, fund],
        activities: {
          [custodyAccountId]: [
            pendingActivity({
              consumedInputs: [spent[0]],
              producedOutputs: [next],
            }),
          ],
        },
      });

      expect(
        selectCardanoCustodyAccountState(state, custodyAccountId),
      ).toMatchObject({
        status: 'live',
        controlUtxo: next,
        state: nextState,
        funds: [fund],
      });
    });

    it('reports a creation that is pending, before any UTxO fetch, as live', () => {
      const created = controlUtxo(1);
      const state = buildState({
        activities: {
          [custodyAccountId]: [
            pendingActivity({ consumedInputs: [], producedOutputs: [created] }),
          ],
        },
      });

      expect(
        selectCardanoCustodyAccountState(state, custodyAccountId),
      ).toMatchObject({ status: 'live', controlUtxo: created });
    });

    it('keeps its result while only another account changes', () => {
      const state = buildState({ custodyUtxos: [controlUtxo(1), fund] });
      const first = selectCardanoCustodyAccountState(state, custodyAccountId);

      const otherAccountChanged = {
        ...state,
        cardanoContext: reducers.cardanoContext(
          (state as { cardanoContext: CardanoContextSliceState })
            .cardanoContext,
          actions.cardanoContext.setAccountUtxos({
            accountId: keyAccountId,
            utxos: [],
          }),
        ),
      } as RootState;

      expect(
        selectCardanoCustodyAccountState(otherAccountChanged, custodyAccountId),
      ).toBe(first);
    });
  });

  describe('selectSettledCardanoCustodyAccountState', () => {
    const { selectSettledCardanoCustodyAccountState } =
      custodySelectors.cardanoCustody;

    it('keeps confirmed control and funds while a pending operation replaces them', () => {
      const control = controlUtxo(1);
      const next = controlUtxo(2, {
        ...custodyState,
        devices: [...custodyState.devices, HexBlob(otherDeviceKeyHash)],
      });
      const state = buildState({
        custodyUtxos: [control, fund],
        withdrawable: 7_000n,
        activities: {
          [custodyAccountId]: [
            pendingActivity({
              consumedInputs: [control[0], fund[0]],
              producedOutputs: [next],
            }),
          ],
        },
      });
      expect(
        selectSettledCardanoCustodyAccountState(state, custodyAccountId),
      ).toMatchObject({
        status: 'live',
        controlUtxo: control,
        state: custodyState,
        funds: [fund],
        withdrawableRewards: 0n,
      });
      expect(
        custodySelectors.cardanoCustody.selectCardanoCustodyAccountState(
          state,
          custodyAccountId,
        ),
      ).toMatchObject({
        status: 'live',
        controlUtxo: next,
        funds: [],
      });
    });

    it('does not treat a pending creation as confirmed before the first fetch', () => {
      const state = buildState({
        activities: {
          [custodyAccountId]: [
            pendingActivity({
              consumedInputs: [],
              producedOutputs: [controlUtxo(1)],
            }),
          ],
        },
      });
      expect(
        selectSettledCardanoCustodyAccountState(state, custodyAccountId),
      ).toBeUndefined();
      expect(
        selectSettledCardanoCustodyAccountState(
          buildState({ custodyUtxos: [] }),
          custodyAccountId,
        ),
      ).toMatchObject({ status: 'notCreated' });
    });

    it('requires protocol parameters from the account network', () => {
      for (const protocolParametersNetwork of [
        null,
        Cardano.NetworkMagics.Mainnet,
      ]) {
        expect(
          selectSettledCardanoCustodyAccountState(
            buildState({
              custodyUtxos: [controlUtxo(1)],
              protocolParametersNetwork,
            }),
            custodyAccountId,
          ),
        ).toBeUndefined();
      }
    });

    it('keeps its result when only pending activities change', () => {
      const state = buildState({ custodyUtxos: [controlUtxo(1), fund] });
      const first = selectSettledCardanoCustodyAccountState(
        state,
        custodyAccountId,
      );
      const changed = {
        ...state,
        activities: {
          ...state.activities,
          activities: {
            [custodyAccountId]: [
              pendingActivity({
                consumedInputs: [fund[0]],
                producedOutputs: [],
              }),
            ],
          },
        },
      };
      expect(
        selectSettledCardanoCustodyAccountState(changed, custodyAccountId),
      ).toBe(first);
    });
  });

  describe('selectAvailableAccountUtxos', () => {
    const { selectAvailableAccountUtxos } = selectors.cardanoContext;

    it('leaves custody accounts out, so ordinary builders never receive script-locked UTxOs', () => {
      const state = buildState({ custodyUtxos: [controlUtxo(1), fund] });

      expect(selectAvailableAccountUtxos(state)).toEqual({
        [keyAccountId]: [utxo1],
      });
    });

    it('keeps key accounts as they were when no custody account exists', () => {
      const state = buildState({
        wallets: [threeAccountCardanoWallet as WalletEntity],
        custodyUtxos: [fund],
      });

      expect(selectAvailableAccountUtxos(state)).toEqual({
        [keyAccountId]: [utxo1],
        [custodyAccountId]: [fund],
      });
    });

    it('keeps its result across a wallet update that leaves custody accounts unchanged', () => {
      const state = buildState({ custodyUtxos: [fund] });
      const first = selectAvailableAccountUtxos(state);
      const renamed = {
        ...threeAccountCardanoWallet,
        metadata: { ...threeAccountCardanoWallet.metadata, name: 'renamed' },
      } as WalletEntity;

      expect(
        selectAvailableAccountUtxos({
          ...state,
          wallets: {
            ids: [renamed.walletId, custodyWallet.walletId],
            entities: {
              [renamed.walletId]: renamed,
              [custodyWallet.walletId]: custodyWallet,
            },
          },
        } as RootState),
      ).toBe(first);
    });
  });
});
