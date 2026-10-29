import { Cardano, Milliseconds } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { WalletType } from '@lace-contract/wallet-repo';
import { classifyCustodyAccountUtxos } from '@lace-lib/cardano-custody';
import { Timestamp } from '@lace-lib/util';
import { Serializable } from '@lace-lib/util-store';
import { describe, expect, it } from 'vitest';

import { CardanoNetworkId } from '../../src';
import { cardanoCustodySelectors as custodySelectors } from '../../src/custody/store';
import {
  cardanoContextActions as actions,
  cardanoContextReducers as reducers,
} from '../../src/store/slice';
import {
  cardanoCustodyAccount,
  controlUtxo,
  custodyGrant,
  custodyLovelaceScope,
  custodyProtocolParameters,
  custodyState,
  custodyUtxo,
  grantUtxo,
} from '../custody-mocks';

import type {
  CardanoContextSliceState,
  RequiredProtocolParameters,
} from '../../src';
import type { EraSummary } from '@cardano-sdk/core';
import type { Activity } from '@lace-contract/activities';
import type { WalletEntity } from '@lace-contract/wallet-repo';
import type {
  CustodyAccountState,
  CustodyGrant,
} from '@lace-lib/cardano-custody';

const { selectCardanoCustodyGrantStatuses } = custodySelectors.cardanoCustody;
type RootState = Parameters<typeof selectCardanoCustodyGrantStatuses>[0];

const accountId = cardanoCustodyAccount.accountId;
const network = CardanoNetworkId(Cardano.NetworkMagics.Preprod);

/** One era from the POSIX epoch with one-second slots: a slot is a second. */
const eraSummaries: EraSummary[] = [
  {
    parameters: { epochLength: 432_000, slotLength: Milliseconds(1000) },
    start: { slot: 0, time: new Date(0) },
  },
];

const TIP_SLOT = 1_800_000_000;
const tipAt = (slot: number): Cardano.Tip => ({
  slot: Cardano.Slot(slot),
  blockNo: Cardano.BlockNo(1),
  hash: Cardano.BlockId('ab'.repeat(32)),
});

const grant = (
  slot: bigint,
  byte: string,
  expiresAt = BigInt(TIP_SLOT + 60) * 1000n,
): CustodyGrant => custodyGrant(slot, byte, custodyLovelaceScope(expiresAt));

/** The state after issuing `issued` grants, none swept. */
const stateAfter = (
  issued: number,
  state: Partial<CustodyAccountState> = {},
): CustodyAccountState => ({
  ...custodyState,
  nextSlot: BigInt(issued),
  outstanding: BigInt(issued),
  ...state,
});

/** The grant as the selector lists it: read back from its UTxO. */
const listed = (utxo: Cardano.Utxo) =>
  classifyCustodyAccountUtxos(cardanoCustodyAccount.blockchainSpecific, [utxo])
    .grants[0];

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

const pendingOperation = (
  spent: Cardano.Utxo[],
  produced: Cardano.Utxo[],
): Activity => ({
  accountId,
  activityId: produced[0][0].txId,
  timestamp: Timestamp(0),
  tokenBalanceChanges: [],
  type: ActivityType.Pending,
  blockchainSpecific: Serializable.to({
    Cardano: {
      consumedInputs: spent.map(([input]) => input),
      producedOutputs: produced,
    },
  }) as unknown,
});

const buildState = ({
  settled,
  pending = [],
  tip = tipAt(TIP_SLOT),
  eras = eraSummaries,
  hasProtocolParameters = true,
}: {
  settled?: Cardano.Utxo[];
  pending?: Activity[];
  /** `null` while no tip is known. */
  tip?: Cardano.Tip | null;
  /** `null` while no era history is known. */
  eras?: EraSummary[] | null;
  hasProtocolParameters?: boolean;
}): RootState => {
  let cardanoContext = emptyCardanoContext;
  if (settled) {
    cardanoContext = reducers.cardanoContext(
      cardanoContext,
      actions.cardanoContext.setAccountUtxos({ accountId, utxos: settled }),
    );
  }
  if (tip) {
    cardanoContext = reducers.cardanoContext(
      cardanoContext,
      actions.cardanoContext.setTip({ network, tip }),
    );
  }
  if (eras) {
    cardanoContext = reducers.cardanoContext(
      cardanoContext,
      actions.cardanoContext.setEraSummaries({ network, eraSummaries: eras }),
    );
  }
  if (hasProtocolParameters) {
    cardanoContext = reducers.cardanoContext(
      cardanoContext,
      actions.cardanoContext.setProtocolParameters({
        network,
        protocolParameters:
          custodyProtocolParameters as RequiredProtocolParameters,
      }),
    );
  }
  const wallet = {
    walletId: cardanoCustodyAccount.walletId,
    type: WalletType.CardanoCustody,
    metadata: { name: 'custody', order: 0 },
    blockchainSpecific: {},
    accounts: [cardanoCustodyAccount],
  } as unknown as WalletEntity;
  return {
    cardanoContext,
    activities: {
      activities: { [accountId]: pending },
      desiredLoadedActivitiesCountPerAccount: {},
      hasLoadedOldestEntry: {},
    },
    addresses: {
      addresses: [
        {
          name: 'custody',
          address: cardanoCustodyAccount.blockchainSpecific.address,
          blockchainName: 'Cardano',
          accountId,
        },
      ],
    },
    network: {
      networkType: 'testnet',
      initialNetworkType: 'testnet',
      blockchainNetworks: { Cardano: { mainnet: network, testnet: network } },
      testnetOptions: {},
    },
    wallets: {
      ids: [wallet.walletId],
      entities: { [wallet.walletId]: wallet },
    },
  } as unknown as RootState;
};

const agent = grant(0n, 'a1');
const agentUtxo = grantUtxo(2, agent);
const confirmedControl = controlUtxo(1, stateAfter(1));
const fund = custodyUtxo(3, { coins: 10_000_000n });
const settled = [confirmedControl, agentUtxo, fund];

describe('selectCardanoCustodyGrantStatuses', () => {
  it('reports confirmed grants as live at the tip time', () => {
    expect(
      selectCardanoCustodyGrantStatuses(buildState({ settled }), accountId),
    ).toEqual([{ ...listed(agentUtxo), status: 'live' }]);
  });

  it('reports a grant as expired once the tip reaches its expiry', () => {
    const expiring = grantUtxo(2, grant(0n, 'a1', BigInt(TIP_SLOT) * 1000n));
    expect(
      selectCardanoCustodyGrantStatuses(
        buildState({ settled: [confirmedControl, expiring] }),
        accountId,
      ),
    ).toEqual([{ ...listed(expiring), status: 'expired' }]);
  });

  it('reports a grant a pending operation issues as pending', () => {
    const issued = grantUtxo(11, grant(1n, 'a2'));
    const next = controlUtxo(10, stateAfter(2));
    expect(
      selectCardanoCustodyGrantStatuses(
        buildState({
          settled,
          pending: [pendingOperation([confirmedControl, fund], [next, issued])],
        }),
        accountId,
      ),
    ).toEqual([
      { ...listed(agentUtxo), status: 'live' },
      { ...listed(issued), status: 'pending' },
    ]);
  });

  it('reports a grant a pending operation revokes as revoking', () => {
    const next = controlUtxo(10, stateAfter(1, { revoked: [0n] }));
    expect(
      selectCardanoCustodyGrantStatuses(
        buildState({
          settled,
          pending: [pendingOperation([confirmedControl], [next])],
        }),
        accountId,
      ),
    ).toEqual([{ ...listed(agentUtxo), status: 'revoking' }]);
  });

  it('reports a revoked grant a pending operation burns as sweeping', () => {
    const revokedControl = controlUtxo(1, stateAfter(1, { revoked: [0n] }));
    const swept = controlUtxo(10, stateAfter(1, { outstanding: 0n }));
    expect(
      selectCardanoCustodyGrantStatuses(
        buildState({
          settled: [revokedControl, agentUtxo],
          pending: [pendingOperation([revokedControl, agentUtxo], [swept])],
        }),
        accountId,
      ),
    ).toEqual([{ ...listed(agentUtxo), status: 'sweeping' }]);
  });

  it('reports the drawn-down grant of a pending grant spend as live at once', () => {
    const spent = grantUtxo(
      10,
      custodyGrant(
        0n,
        'a1',
        custodyLovelaceScope(agent.scope.expiresAt, { cap: 40_000_000n }),
      ),
    );
    expect(
      selectCardanoCustodyGrantStatuses(
        buildState({
          settled,
          pending: [pendingOperation([agentUtxo, fund], [spent])],
        }),
        accountId,
      ),
    ).toEqual([{ ...listed(spent), status: 'live' }]);
  });

  it('is undefined while the account is not live', () => {
    expect(
      selectCardanoCustodyGrantStatuses(buildState({ settled: [] }), accountId),
    ).toBeUndefined();
    expect(
      selectCardanoCustodyGrantStatuses(buildState({}), accountId),
    ).toBeUndefined();
  });

  it('is undefined until the protocol parameters are known', () => {
    expect(
      selectCardanoCustodyGrantStatuses(
        buildState({ settled, hasProtocolParameters: false }),
        accountId,
      ),
    ).toBeUndefined();
  });

  it('is undefined until the tip and the era history are known', () => {
    expect(
      selectCardanoCustodyGrantStatuses(
        buildState({ settled, tip: null }),
        accountId,
      ),
    ).toBeUndefined();
    expect(
      selectCardanoCustodyGrantStatuses(
        buildState({ settled, eras: null }),
        accountId,
      ),
    ).toBeUndefined();
    expect(
      selectCardanoCustodyGrantStatuses(
        buildState({ settled, eras: [] }),
        accountId,
      ),
    ).toBeUndefined();
  });

  it('is undefined when the era history does not reach back to the tip', () => {
    const later: EraSummary[] = [
      {
        parameters: { epochLength: 432_000, slotLength: Milliseconds(1000) },
        start: { slot: TIP_SLOT + 1, time: new Date(0) },
      },
    ];
    expect(
      selectCardanoCustodyGrantStatuses(
        buildState({ settled, eras: later }),
        accountId,
      ),
    ).toBeUndefined();
  });
});
