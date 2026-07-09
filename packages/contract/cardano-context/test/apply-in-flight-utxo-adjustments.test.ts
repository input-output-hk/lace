import { Cardano } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { AccountId } from '@lace-contract/wallet-repo';
import { Timestamp } from '@lace-sdk/util';
import { describe, expect, it } from 'vitest';

import { applyInFlightUtxoAdjustments } from '../src/apply-in-flight-utxo-adjustments';
import { CardanoPaymentAddress } from '../src/types';

import type { CardanoInFlightUtxoActivityMetadata } from '../src/augmentations';
import type { Activity } from '@lace-contract/activities';

const testAccountId = AccountId('test-account');
const OWN_ADDRESS = CardanoPaymentAddress(
  'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp',
);
const OWN_ADDRESS_2 = CardanoPaymentAddress(
  'addr_test1qpuzeec0zqcm6lrdygkkvvd8e6qactnsl5zzeujsdpkpc939l2f2vykk0ctwq4ys6w3jg8pm0kknmy8m5pml8f9cauzq2zuc95',
);
const FOREIGN_ADDRESS = CardanoPaymentAddress(
  'addr_test1qqt3r9kd56aq9ajynjkz8hdfw3kc0pcv3tpzug8azxls62tvvz7nw9gmznn65g4ksrrfvyzhz52knc3mqxdyya47gz2qmcjmcq',
);

const previousTxId = Cardano.TransactionId(
  '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58',
);
const pendingTxId = Cardano.TransactionId(
  '4c4e67bafa15e742c13c592b65c8f74c769cd7d9af04c848099672d1ba391b49',
);

/* eslint-disable max-params */
const makeUtxo = (
  txId: Cardano.TransactionId,
  index: number,
  coins: bigint,
  address: CardanoPaymentAddress = OWN_ADDRESS,
): Cardano.Utxo => [
  { txId, index, address: Cardano.PaymentAddress(address) },
  { address: Cardano.PaymentAddress(address), value: { coins } },
];
/* eslint-enable max-params */

const inFlight = (
  metadata: CardanoInFlightUtxoActivityMetadata,
  id = 'pending-activity-id',
): Activity => ({
  accountId: testAccountId,
  activityId: id,
  timestamp: Timestamp(0),
  tokenBalanceChanges: [],
  type: ActivityType.Pending,
  blockchainSpecific: { Cardano: metadata },
});

describe('applyInFlightUtxoAdjustments', () => {
  it('returns the original list when there are no pending activities', () => {
    const utxos = [makeUtxo(previousTxId, 0, 10_000_000n)];
    expect(applyInFlightUtxoAdjustments(utxos, [OWN_ADDRESS], [])).toBe(utxos);
  });

  it('returns the original list when pending activities have no Cardano in-flight metadata', () => {
    const utxos = [makeUtxo(previousTxId, 0, 10_000_000n)];
    const unrelated: Activity = {
      accountId: testAccountId,
      activityId: 'tx-x',
      timestamp: Timestamp(0),
      tokenBalanceChanges: [],
      type: ActivityType.Pending,
    };
    expect(
      applyInFlightUtxoAdjustments(utxos, [OWN_ADDRESS], [unrelated]),
    ).toBe(utxos);
  });

  it('drops utxos consumed by a pending tx (input matches availableUtxo)', () => {
    const utxoA = makeUtxo(previousTxId, 0, 10_000_000n);
    const utxoB = makeUtxo(previousTxId, 1, 5_000_000n);

    const result = applyInFlightUtxoAdjustments(
      [utxoA, utxoB],
      [OWN_ADDRESS],
      [
        inFlight({
          consumedInputs: [{ txId: previousTxId, index: 0 }],
          producedOutputs: [],
        }),
      ],
    );

    expect(result).toEqual([utxoB]);
  });

  it('does NOT drop utxos when the consumed input is not in our available set (foreign input)', () => {
    const utxoA = makeUtxo(previousTxId, 0, 10_000_000n);

    const result = applyInFlightUtxoAdjustments(
      [utxoA],
      [OWN_ADDRESS],
      [
        inFlight({
          // Some unrelated outpoint (e.g. the tx also consumes a foreign input)
          consumedInputs: [
            { txId: previousTxId, index: 7 },
            { txId: previousTxId, index: 0 },
          ],
          producedOutputs: [],
        }),
      ],
    );

    expect(result).toEqual([]);
  });

  it('appends outputs whose address matches accountAddresses and ignores foreign outputs', () => {
    const utxoA = makeUtxo(previousTxId, 0, 10_000_000n);
    const ownChange = makeUtxo(pendingTxId, 1, 6_000_000n, OWN_ADDRESS_2);
    const foreignOutput = makeUtxo(pendingTxId, 0, 3_000_000n, FOREIGN_ADDRESS);

    const result = applyInFlightUtxoAdjustments(
      [utxoA],
      [OWN_ADDRESS, OWN_ADDRESS_2],
      [
        inFlight({
          consumedInputs: [],
          producedOutputs: [foreignOutput, ownChange],
        }),
      ],
    );

    expect(result).toEqual([utxoA, ownChange]);
  });

  it('does not duplicate produced outputs when the chain UTxO already includes them (post-confirmation race)', () => {
    // Race window between chain UTxO refresh and activity status flip from Pending
    // to Send/Receive: the produced outpoint is already in availableUtxo, so it
    // must not be appended a second time.
    const ownChange = makeUtxo(pendingTxId, 0, 6_000_000n);

    const result = applyInFlightUtxoAdjustments(
      [ownChange],
      [OWN_ADDRESS],
      [
        inFlight({
          consumedInputs: [],
          producedOutputs: [ownChange],
        }),
      ],
    );

    expect(result).toEqual([ownChange]);
  });

  it('appends ALL own outputs from a DApp-style pending tx (multiple own outputs)', () => {
    const utxoA = makeUtxo(previousTxId, 0, 10_000_000n);
    const ownOutput1 = makeUtxo(pendingTxId, 0, 2_000_000n);
    const ownOutput2 = makeUtxo(pendingTxId, 1, 4_000_000n, OWN_ADDRESS_2);
    const ownOutput3 = makeUtxo(pendingTxId, 2, 1_500_000n);

    const result = applyInFlightUtxoAdjustments(
      [utxoA],
      [OWN_ADDRESS, OWN_ADDRESS_2],
      [
        inFlight({
          consumedInputs: [],
          producedOutputs: [ownOutput1, ownOutput2, ownOutput3],
        }),
      ],
    );

    expect(result).toEqual([utxoA, ownOutput1, ownOutput2, ownOutput3]);
  });

  it('covers the "address added after submit" edge case: output becomes own once the address list is extended', () => {
    const laterDiscoveredOutput = makeUtxo(
      pendingTxId,
      0,
      7_500_000n,
      OWN_ADDRESS_2,
    );

    const resultBeforeDiscovery = applyInFlightUtxoAdjustments(
      [],
      [OWN_ADDRESS],
      [
        inFlight({
          consumedInputs: [],
          producedOutputs: [laterDiscoveredOutput],
        }),
      ],
    );
    expect(resultBeforeDiscovery).toEqual([]);

    const resultAfterDiscovery = applyInFlightUtxoAdjustments(
      [],
      [OWN_ADDRESS, OWN_ADDRESS_2],
      [
        inFlight({
          consumedInputs: [],
          producedOutputs: [laterDiscoveredOutput],
        }),
      ],
    );
    expect(resultAfterDiscovery).toEqual([laterDiscoveredOutput]);
  });

  it('supports chained pending tx: spends input of tx1 and adds tx1 own outputs', () => {
    const utxoA = makeUtxo(previousTxId, 0, 10_000_000n);
    const changeUtxo = makeUtxo(pendingTxId, 0, 6_000_000n);

    const result = applyInFlightUtxoAdjustments(
      [utxoA],
      [OWN_ADDRESS],
      [
        inFlight({
          consumedInputs: [{ txId: previousTxId, index: 0 }],
          producedOutputs: [changeUtxo],
        }),
      ],
    );

    expect(result).toEqual([changeUtxo]);
  });

  it('supports tx2 consuming an own output produced by tx1 (chaining across multi-own-output txs)', () => {
    const tx1Out0 = makeUtxo(pendingTxId, 0, 2_000_000n);
    const tx1Out1 = makeUtxo(pendingTxId, 1, 4_000_000n);
    const tx2Id = Cardano.TransactionId(
      'a8c5b55caa9d716c3d98df7df19b33b66b1d5d5b4a894aa8f53adcdfb9e66ae9',
    );
    const tx2Out0 = makeUtxo(tx2Id, 0, 1_500_000n);

    const result = applyInFlightUtxoAdjustments(
      [],
      [OWN_ADDRESS],
      [
        inFlight(
          {
            consumedInputs: [],
            producedOutputs: [tx1Out0, tx1Out1],
          },
          'tx1',
        ),
        inFlight(
          {
            consumedInputs: [{ txId: pendingTxId, index: 0 }],
            producedOutputs: [tx2Out0],
          },
          'tx2',
        ),
      ],
    );

    expect(result).toEqual([tx1Out1, tx2Out0]);
  });

  it('ignores activities that are not Pending', () => {
    const utxoA = makeUtxo(previousTxId, 0, 10_000_000n);
    const confirmed: Activity = {
      accountId: testAccountId,
      activityId: 'tx-confirmed',
      timestamp: Timestamp(0),
      tokenBalanceChanges: [],
      type: ActivityType.Send,
      blockchainSpecific: {
        Cardano: {
          consumedInputs: [{ txId: previousTxId, index: 0 }],
          producedOutputs: [],
        },
      },
    };
    expect(
      applyInFlightUtxoAdjustments([utxoA], [OWN_ADDRESS], [confirmed]),
    ).toEqual([utxoA]);
  });

  it('respects chronological activity order when later tx consumes an output produced by earlier tx', () => {
    const producedOutpoint = Cardano.TransactionId(
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    );
    const earlierProducedOwn = makeUtxo(producedOutpoint, 0, 3_000_000n);
    const laterTxId = Cardano.TransactionId(
      'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    );
    const laterProducedOwn = makeUtxo(laterTxId, 0, 1_000_000n);

    const earlier = inFlight(
      {
        consumedInputs: [],
        producedOutputs: [earlierProducedOwn],
      },
      'earlier',
    );
    const later = inFlight(
      {
        consumedInputs: [{ txId: producedOutpoint, index: 0 }],
        producedOutputs: [laterProducedOwn],
      },
      'later',
    );

    const earlierFirst = applyInFlightUtxoAdjustments(
      [],
      [OWN_ADDRESS],
      [
        { ...earlier, timestamp: Timestamp(1_000) },
        { ...later, timestamp: Timestamp(2_000) },
      ],
    );
    expect(earlierFirst).toEqual([laterProducedOwn]);

    const newestFirst = applyInFlightUtxoAdjustments(
      [],
      [OWN_ADDRESS],
      [
        { ...later, timestamp: Timestamp(2_000) },
        { ...earlier, timestamp: Timestamp(1_000) },
      ],
    );
    expect(newestFirst).toEqual([laterProducedOwn]);
  });

  it('merges adjustments across multiple pending activities', () => {
    const utxoA = makeUtxo(previousTxId, 0, 10_000_000n);
    const utxoB = makeUtxo(previousTxId, 1, 5_000_000n);
    const changeFromTx1 = makeUtxo(pendingTxId, 0, 4_000_000n);
    const changeFromTx2 = makeUtxo(
      Cardano.TransactionId(
        'a8c5b55caa9d716c3d98df7df19b33b66b1d5d5b4a894aa8f53adcdfb9e66ae9',
      ),
      0,
      2_000_000n,
    );

    const result = applyInFlightUtxoAdjustments(
      [utxoA, utxoB],
      [OWN_ADDRESS],
      [
        inFlight(
          {
            consumedInputs: [{ txId: previousTxId, index: 0 }],
            producedOutputs: [changeFromTx1],
          },
          'tx1',
        ),
        inFlight(
          {
            consumedInputs: [{ txId: previousTxId, index: 1 }],
            producedOutputs: [changeFromTx2],
          },
          'tx2',
        ),
      ],
    );

    expect(result).toEqual([changeFromTx1, changeFromTx2]);
  });
});
