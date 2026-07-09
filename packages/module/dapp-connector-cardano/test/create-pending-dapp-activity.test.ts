import { Cardano, Serialization } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { AccountId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import { createPendingDappActivity } from '../src/common/store/create-pending-dapp-activity';

import type { AnyAddress } from '@lace-contract/addresses';
import type { AccountUtxoMap } from '@lace-contract/cardano-context';

const OWN_ADDRESS =
  'addr_test1qphhr294v0w0rzgk7kz4ynsp8hwt82ha6nsp8yk6h04fhzsuryus5g7pm3lq85msee5pdtqlnv2crdc83kk2tvhsefcsu2snle';
const FOREIGN_ADDRESS =
  'addr_test1qqt3r9kd56aq9ajynjkz8hdfw3kc0pcv3tpzug8azxls62tvvz7nw9gmznn65g4ksrrfvyzhz52knc3mqxdyya47gz2qmcjmcq';

const PREV_TX_ID = Cardano.TransactionId(
  '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58',
);

const HINTED_ACCOUNT_ID = AccountId('hinted-account');
const OTHER_ACCOUNT_ID = AccountId('other-account');

const emptyWitness: Cardano.Witness = { signatures: new Map() };

const makeSerializedTx = (body: Cardano.TxBody): string => {
  const cbor = Serialization.Transaction.fromCore({
    body,
    id: '0'.repeat(64) as Cardano.TransactionId,
    witness: emptyWitness,
  }).toCbor();
  return cbor;
};

const createCardanoAddress = (
  address: string,
  accountId: ReturnType<typeof AccountId>,
): AnyAddress =>
  ({
    address,
    accountId,
    blockchainName: 'Cardano',
  } as unknown as AnyAddress);

describe('createPendingDappActivity', () => {
  it('uses empty UTXO list when the hinted account has no entry in the account UTXO map (receive-only tx)', () => {
    const serializedTx = makeSerializedTx({
      inputs: [{ txId: PREV_TX_ID, index: 0 }],
      outputs: [
        {
          address: Cardano.PaymentAddress(OWN_ADDRESS),
          value: { coins: 5_000_000n },
        },
      ],
      fee: 200_000n,
    });

    const accountUtxos: AccountUtxoMap = {};

    const allAddresses: AnyAddress[] = [
      createCardanoAddress(OWN_ADDRESS, HINTED_ACCOUNT_ID),
    ];

    const activity = createPendingDappActivity({
      serializedTx,
      accountIdHint: HINTED_ACCOUNT_ID,
      accountUtxos,
      allAddresses,
    });

    expect(activity).toBeDefined();
    expect(activity!.type).toBe(ActivityType.Pending);
    expect(activity!.accountId).toBe(HINTED_ACCOUNT_ID);
  });

  it('does not crash when the input-matching fallback encounters an account whose UTXOs value is undefined', () => {
    const serializedTx = makeSerializedTx({
      inputs: [{ txId: PREV_TX_ID, index: 0 }],
      outputs: [
        {
          address: Cardano.PaymentAddress(FOREIGN_ADDRESS),
          value: { coins: 1_000_000n },
        },
      ],
      fee: 200_000n,
    });

    const accountUtxos = {
      [OTHER_ACCOUNT_ID]: undefined as unknown as Cardano.Utxo[],
    } as AccountUtxoMap;

    const activity = createPendingDappActivity({
      serializedTx,
      accountUtxos,
      allAddresses: [],
    });

    expect(activity).toBeUndefined();
  });
});
