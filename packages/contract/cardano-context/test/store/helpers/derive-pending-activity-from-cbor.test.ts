import { Cardano, Serialization } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { TokenId } from '@lace-contract/tokens';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber, HexBytes } from '@lace-lib/util';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { derivePendingActivityFromCbor } from '../../../src/store/helpers/derive-pending-activity-from-cbor';
import { CardanoPaymentAddress } from '../../../src/types';

import type { CardanoInFlightUtxoActivityMetadata } from '../../../src/augmentations';
import type { Activity } from '@lace-contract/activities';

const getCardanoInFlight = (
  activity: Activity | undefined,
): CardanoInFlightUtxoActivityMetadata | undefined =>
  (
    activity?.blockchainSpecific as
      | { Cardano?: CardanoInFlightUtxoActivityMetadata }
      | undefined
  )?.Cardano;

const OWN_ADDRESS = CardanoPaymentAddress(
  'addr_test1qphhr294v0w0rzgk7kz4ynsp8hwt82ha6nsp8yk6h04fhzsuryus5g7pm3lq85msee5pdtqlnv2crdc83kk2tvhsefcsu2snle',
);
const OWN_ADDRESS_2 = CardanoPaymentAddress(
  'addr_test1qpuzeec0zqcm6lrdygkkvvd8e6qactnsl5zzeujsdpkpc939l2f2vykk0ctwq4ys6w3jg8pm0kknmy8m5pml8f9cauzq2zuc95',
);
const FOREIGN_ADDRESS = CardanoPaymentAddress(
  'addr_test1qqt3r9kd56aq9ajynjkz8hdfw3kc0pcv3tpzug8azxls62tvvz7nw9gmznn65g4ksrrfvyzhz52knc3mqxdyya47gz2qmcjmcq',
);

const PREV_TX_ID = Cardano.TransactionId(
  '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58',
);
const OTHER_TX_ID = Cardano.TransactionId(
  '4c4e67bafa15e742c13c592b65c8f74c769cd7d9af04c848099672d1ba391b49',
);

const ASSET_ID_A = Cardano.AssetId(
  'b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e75746f6b656e31',
);

const ACCOUNT_ID = AccountId('test-account');

const utxo = ({
  txId,
  index,
  address,
  value,
}: {
  txId: Cardano.TransactionId;
  index: number;
  address: Cardano.PaymentAddress;
  value: Cardano.Value;
}): Cardano.Utxo => [
  { txId, index, address },
  { address, value },
];

const buildTxCbor = (core: Cardano.Tx): HexBytes =>
  HexBytes(Serialization.Transaction.fromCore(core).toCbor());

const emptyWitness: Cardano.Witness = { signatures: new Map() };

const makeCoreTx = (body: Cardano.TxBody): Cardano.Tx => {
  const cbor = Serialization.Transaction.fromCore({
    body,
    id: '0'.repeat(64) as Cardano.TransactionId,
    witness: emptyWitness,
  }).toCbor();
  return Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(cbor),
  ).toCore();
};

describe('derivePendingActivityFromCbor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-02T03:04:05Z'));
  });

  it('returns Pending activity with negative lovelace for a send-all tx (all inputs ours, no own outputs)', () => {
    const accountUtxo = utxo({
      txId: PREV_TX_ID,
      index: 0,
      address: Cardano.PaymentAddress(OWN_ADDRESS),
      value: { coins: 10_000_000n },
    });

    const core = makeCoreTx({
      inputs: [{ txId: PREV_TX_ID, index: 0 }],
      outputs: [
        {
          address: Cardano.PaymentAddress(FOREIGN_ADDRESS),
          value: { coins: 9_800_000n },
        },
      ],
      fee: 200_000n,
    });
    const serializedTx = buildTxCbor(core);

    const activity = derivePendingActivityFromCbor({
      serializedTx,
      accountId: ACCOUNT_ID,
      accountAddresses: [OWN_ADDRESS],
      accountUtxos: [accountUtxo],
    });

    expect(activity).toBeDefined();
    expect(activity!.type).toBe(ActivityType.Pending);
    expect(activity!.accountId).toBe(ACCOUNT_ID);
    expect(activity!.activityId).toBe(
      String(
        Serialization.Transaction.fromCbor(
          Serialization.TxCBOR(serializedTx),
        ).getId(),
      ),
    );
    expect(activity!.timestamp).toBe(
      new Date('2024-01-02T03:04:05Z').getTime(),
    );
    expect(activity!.tokenBalanceChanges).toEqual([
      { tokenId: TokenId('lovelace'), amount: BigNumber(-10_000_000n) },
    ]);
  });

  it('returns Pending activity with positive lovelace for a receive-only tx', () => {
    const core = makeCoreTx({
      inputs: [{ txId: PREV_TX_ID, index: 0 }],
      outputs: [
        {
          address: Cardano.PaymentAddress(OWN_ADDRESS),
          value: { coins: 5_000_000n },
        },
      ],
      fee: 200_000n,
    });
    const serializedTx = buildTxCbor(core);

    const activity = derivePendingActivityFromCbor({
      serializedTx,
      accountId: ACCOUNT_ID,
      accountAddresses: [OWN_ADDRESS],
      accountUtxos: [],
    });

    expect(activity).toBeDefined();
    expect(activity!.tokenBalanceChanges).toEqual([
      { tokenId: TokenId('lovelace'), amount: BigNumber(5_000_000n) },
    ]);
  });

  it('correctly computes mixed balance (own input + own change output) - net negative by spent + fee', () => {
    const accountUtxo = utxo({
      txId: PREV_TX_ID,
      index: 0,
      address: Cardano.PaymentAddress(OWN_ADDRESS),
      value: { coins: 10_000_000n },
    });

    const core = makeCoreTx({
      inputs: [{ txId: PREV_TX_ID, index: 0 }],
      outputs: [
        {
          address: Cardano.PaymentAddress(FOREIGN_ADDRESS),
          value: { coins: 3_000_000n },
        },
        {
          address: Cardano.PaymentAddress(OWN_ADDRESS_2),
          value: { coins: 6_800_000n },
        },
      ],
      fee: 200_000n,
    });
    const serializedTx = buildTxCbor(core);

    const activity = derivePendingActivityFromCbor({
      serializedTx,
      accountId: ACCOUNT_ID,
      accountAddresses: [OWN_ADDRESS, OWN_ADDRESS_2],
      accountUtxos: [accountUtxo],
    });

    expect(activity).toBeDefined();
    expect(activity!.tokenBalanceChanges).toEqual([
      { tokenId: TokenId('lovelace'), amount: BigNumber(-3_200_000n) },
    ]);
  });

  it('handles multi-asset values (native tokens) correctly', () => {
    const accountUtxo = utxo({
      txId: PREV_TX_ID,
      index: 0,
      address: Cardano.PaymentAddress(OWN_ADDRESS),
      value: {
        coins: 10_000_000n,
        assets: new Map([[ASSET_ID_A, 100n]]),
      },
    });

    const core = makeCoreTx({
      inputs: [{ txId: PREV_TX_ID, index: 0 }],
      outputs: [
        {
          address: Cardano.PaymentAddress(FOREIGN_ADDRESS),
          value: {
            coins: 2_000_000n,
            assets: new Map([[ASSET_ID_A, 40n]]),
          },
        },
        {
          address: Cardano.PaymentAddress(OWN_ADDRESS),
          value: {
            coins: 7_800_000n,
            assets: new Map([[ASSET_ID_A, 60n]]),
          },
        },
      ],
      fee: 200_000n,
    });
    const serializedTx = buildTxCbor(core);

    const activity = derivePendingActivityFromCbor({
      serializedTx,
      accountId: ACCOUNT_ID,
      accountAddresses: [OWN_ADDRESS],
      accountUtxos: [accountUtxo],
    });

    expect(activity).toBeDefined();
    const byToken = new Map(
      activity!.tokenBalanceChanges.map(c => [String(c.tokenId), c.amount]),
    );
    expect(byToken.get('lovelace')).toEqual(BigNumber(-2_200_000n));
    expect(byToken.get(ASSET_ID_A)).toEqual(BigNumber(-40n));
  });

  it('returns undefined when tx involves neither own inputs nor own outputs', () => {
    const core = makeCoreTx({
      inputs: [{ txId: OTHER_TX_ID, index: 2 }],
      outputs: [
        {
          address: Cardano.PaymentAddress(FOREIGN_ADDRESS),
          value: { coins: 1_000_000n },
        },
      ],
      fee: 200_000n,
    });
    const serializedTx = buildTxCbor(core);

    const activity = derivePendingActivityFromCbor({
      serializedTx,
      accountId: ACCOUNT_ID,
      accountAddresses: [OWN_ADDRESS],
      accountUtxos: [],
    });

    expect(activity).toBeUndefined();
  });

  it('returns Activity with empty tokenBalanceChanges for a self-transfer that nets to zero', () => {
    const accountUtxo = utxo({
      txId: PREV_TX_ID,
      index: 0,
      address: Cardano.PaymentAddress(OWN_ADDRESS),
      value: { coins: 10_000_000n },
    });

    const core = makeCoreTx({
      inputs: [{ txId: PREV_TX_ID, index: 0 }],
      outputs: [
        {
          address: Cardano.PaymentAddress(OWN_ADDRESS_2),
          value: { coins: 10_000_000n },
        },
      ],
      fee: 0n,
    });
    const serializedTx = buildTxCbor(core);

    const activity = derivePendingActivityFromCbor({
      serializedTx,
      accountId: ACCOUNT_ID,
      accountAddresses: [OWN_ADDRESS, OWN_ADDRESS_2],
      accountUtxos: [accountUtxo],
    });

    expect(activity).toBeDefined();
    expect(activity!.tokenBalanceChanges).toEqual([]);
    expect(activity!.type).toBe(ActivityType.Pending);
  });

  it('uses the txId returned by tx.getId() as the activityId', () => {
    const core = makeCoreTx({
      inputs: [{ txId: PREV_TX_ID, index: 0 }],
      outputs: [
        {
          address: Cardano.PaymentAddress(OWN_ADDRESS),
          value: { coins: 5_000_000n },
        },
      ],
      fee: 200_000n,
    });
    const serializedTx = buildTxCbor(core);
    const expectedTxId = String(
      Serialization.Transaction.fromCbor(
        Serialization.TxCBOR(serializedTx),
      ).getId(),
    );

    const activity = derivePendingActivityFromCbor({
      serializedTx,
      accountId: ACCOUNT_ID,
      accountAddresses: [OWN_ADDRESS],
      accountUtxos: [],
    });

    expect(activity!.activityId).toBe(expectedTxId);
  });

  it('uses TokenId("lovelace") for ADA balance entries', () => {
    const core = makeCoreTx({
      inputs: [{ txId: PREV_TX_ID, index: 0 }],
      outputs: [
        {
          address: Cardano.PaymentAddress(OWN_ADDRESS),
          value: { coins: 1_234n },
        },
      ],
      fee: 0n,
    });
    const serializedTx = buildTxCbor(core);

    const activity = derivePendingActivityFromCbor({
      serializedTx,
      accountId: ACCOUNT_ID,
      accountAddresses: [OWN_ADDRESS],
      accountUtxos: [],
    });

    expect(activity!.tokenBalanceChanges[0].tokenId).toBe(TokenId('lovelace'));
  });

  describe('blockchainSpecific in-flight metadata', () => {
    it('records ALL inputs (own and foreign) in consumedInputs', () => {
      const ownUtxo = utxo({
        txId: PREV_TX_ID,
        index: 0,
        address: Cardano.PaymentAddress(OWN_ADDRESS),
        value: { coins: 10_000_000n },
      });

      const core = makeCoreTx({
        inputs: [
          { txId: PREV_TX_ID, index: 0 }, // ours
          { txId: OTHER_TX_ID, index: 1 }, // not ours
        ],
        outputs: [
          {
            address: Cardano.PaymentAddress(FOREIGN_ADDRESS),
            value: { coins: 3_000_000n },
          },
          {
            address: Cardano.PaymentAddress(OWN_ADDRESS),
            value: { coins: 6_800_000n },
          },
        ],
        fee: 200_000n,
      });
      const serializedTx = buildTxCbor(core);

      const activity = derivePendingActivityFromCbor({
        serializedTx,
        accountId: ACCOUNT_ID,
        accountAddresses: [OWN_ADDRESS],
        accountUtxos: [ownUtxo],
      });

      const cardano = getCardanoInFlight(activity);
      expect(cardano).toBeDefined();
      expect(cardano!.consumedInputs).toEqual([
        { txId: PREV_TX_ID, index: 0 },
        { txId: OTHER_TX_ID, index: 1 },
      ]);
    });

    it('records ALL outputs (own and foreign) in producedOutputs with new txId outpoints', () => {
      const core = makeCoreTx({
        inputs: [{ txId: PREV_TX_ID, index: 0 }],
        outputs: [
          {
            address: Cardano.PaymentAddress(FOREIGN_ADDRESS),
            value: { coins: 3_000_000n },
          },
          {
            address: Cardano.PaymentAddress(OWN_ADDRESS_2),
            value: { coins: 6_800_000n },
          },
        ],
        fee: 200_000n,
      });
      const serializedTx = buildTxCbor(core);

      const expectedTxId = Serialization.Transaction.fromCbor(
        Serialization.TxCBOR(serializedTx),
      ).getId();

      const activity = derivePendingActivityFromCbor({
        serializedTx,
        accountId: ACCOUNT_ID,
        accountAddresses: [OWN_ADDRESS, OWN_ADDRESS_2],
        accountUtxos: [],
      });

      const cardano = getCardanoInFlight(activity);
      expect(cardano!.producedOutputs).toHaveLength(2);
      expect(cardano!.producedOutputs[0][0]).toEqual({
        txId: expectedTxId,
        index: 0,
      });
      expect(cardano!.producedOutputs[0][1].address).toBe(
        Cardano.PaymentAddress(FOREIGN_ADDRESS),
      );
      expect(cardano!.producedOutputs[0][1].value.coins).toBe(3_000_000n);
      expect(cardano!.producedOutputs[1][0]).toEqual({
        txId: expectedTxId,
        index: 1,
      });
      expect(cardano!.producedOutputs[1][1].address).toBe(
        Cardano.PaymentAddress(OWN_ADDRESS_2),
      );
      expect(cardano!.producedOutputs[1][1].value.coins).toBe(6_800_000n);
    });

    it('captures ALL outputs of a DApp-style multi-output tx regardless of ownership', () => {
      const core = makeCoreTx({
        inputs: [{ txId: PREV_TX_ID, index: 0 }],
        outputs: [
          {
            address: Cardano.PaymentAddress(OWN_ADDRESS),
            value: { coins: 1_000_000n },
          },
          {
            address: Cardano.PaymentAddress(FOREIGN_ADDRESS),
            value: { coins: 2_000_000n },
          },
          {
            address: Cardano.PaymentAddress(OWN_ADDRESS_2),
            value: { coins: 5_000_000n },
          },
        ],
        fee: 200_000n,
      });
      const serializedTx = buildTxCbor(core);

      const activity = derivePendingActivityFromCbor({
        serializedTx,
        accountId: ACCOUNT_ID,
        accountAddresses: [OWN_ADDRESS, OWN_ADDRESS_2],
        accountUtxos: [],
      });

      const cardano = getCardanoInFlight(activity);
      expect(cardano!.producedOutputs).toHaveLength(3);
      expect(
        cardano!.producedOutputs.map(([outpoint]) => outpoint.index),
      ).toEqual([0, 1, 2]);
      expect(cardano!.producedOutputs[1][1].address).toBe(
        Cardano.PaymentAddress(FOREIGN_ADDRESS),
      );
    });

    it('records consumedInputs and producedOutputs even when tx has no own outputs', () => {
      const accountUtxo = utxo({
        txId: PREV_TX_ID,
        index: 0,
        address: Cardano.PaymentAddress(OWN_ADDRESS),
        value: { coins: 10_000_000n },
      });

      const core = makeCoreTx({
        inputs: [{ txId: PREV_TX_ID, index: 0 }],
        outputs: [
          {
            address: Cardano.PaymentAddress(FOREIGN_ADDRESS),
            value: { coins: 9_800_000n },
          },
        ],
        fee: 200_000n,
      });
      const serializedTx = buildTxCbor(core);

      const activity = derivePendingActivityFromCbor({
        serializedTx,
        accountId: ACCOUNT_ID,
        accountAddresses: [OWN_ADDRESS],
        accountUtxos: [accountUtxo],
      });

      const cardano = getCardanoInFlight(activity);
      expect(cardano).toBeDefined();
      expect(cardano!.consumedInputs).toEqual([{ txId: PREV_TX_ID, index: 0 }]);
      expect(cardano!.producedOutputs).toHaveLength(1);
      expect(cardano!.producedOutputs[0][1].address).toBe(
        Cardano.PaymentAddress(FOREIGN_ADDRESS),
      );
    });

    it('captures the sole own output for a receive-only tx', () => {
      const core = makeCoreTx({
        inputs: [{ txId: PREV_TX_ID, index: 0 }],
        outputs: [
          {
            address: Cardano.PaymentAddress(OWN_ADDRESS),
            value: { coins: 5_000_000n },
          },
        ],
        fee: 200_000n,
      });
      const serializedTx = buildTxCbor(core);

      const activity = derivePendingActivityFromCbor({
        serializedTx,
        accountId: ACCOUNT_ID,
        accountAddresses: [OWN_ADDRESS],
        accountUtxos: [],
      });

      const cardano = getCardanoInFlight(activity);
      expect(cardano!.consumedInputs).toEqual([{ txId: PREV_TX_ID, index: 0 }]);
      expect(cardano!.producedOutputs).toHaveLength(1);
      expect(cardano!.producedOutputs[0][1].address).toBe(
        Cardano.PaymentAddress(OWN_ADDRESS),
      );
      expect(cardano!.producedOutputs[0][1].value.coins).toBe(5_000_000n);
    });
  });
});
