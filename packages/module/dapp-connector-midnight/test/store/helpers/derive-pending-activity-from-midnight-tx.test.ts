import {
  NIGHT_TOKEN_ID,
  toUnshieldedTokenType,
} from '@lace-contract/midnight-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-lib/util';
import { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { derivePendingActivityFromMidnightTx } from '../../../src/store/helpers/derive-pending-activity-from-midnight-tx';

import type * as ledger from '@midnight-ntwrk/ledger-v8';
import type { UtxoWithMeta } from '@midnight-ntwrk/wallet-sdk/facade';

const NETWORK_ID = NetworkId.NetworkId.Preview;
const ACCOUNT_ID = AccountId('test-account');
const TX_HASH = 'tx-hash-0xdeadbeef';
const OWN_ADDRESS_HEX = 'own-useraddress-hex';
const FOREIGN_ADDRESS_HEX = 'foreign-useraddress-hex';
const OTHER_TOKEN_TYPE =
  '1111111111111111111111111111111111111111111111111111111111111111';

type OfferShape = {
  inputs: ReadonlyArray<{
    intentHash: string;
    outputNo: number;
    type: string;
    value: bigint;
  }>;
  outputs: ReadonlyArray<{
    owner: string;
    type: string;
    value: bigint;
  }>;
};

const makeTx = (
  offers: ReadonlyArray<{
    guaranteed?: OfferShape;
    fallible?: OfferShape;
  }>,
  { hash = TX_HASH }: { hash?: string } = {},
) => {
  const intents = new Map(
    offers.map((offer, index) => [
      index + 1,
      {
        guaranteedUnshieldedOffer: offer.guaranteed,
        fallibleUnshieldedOffer: offer.fallible,
      },
    ]),
  );
  return {
    intents,
    transactionHash: () => hash,
  } as unknown as ledger.Transaction<
    ledger.SignatureEnabled,
    ledger.Proof,
    ledger.Binding
  >;
};

const makeUtxo = ({
  intentHash,
  outputNo,
  type = NIGHT_TOKEN_ID,
  value,
}: {
  intentHash: string;
  outputNo: number;
  type?: string;
  value: bigint;
}): UtxoWithMeta =>
  ({
    utxo: {
      intentHash,
      outputNo,
      type,
      value,
      owner: OWN_ADDRESS_HEX,
    },
    meta: { ctime: new Date(0), registeredForDustGeneration: false },
  } as unknown as UtxoWithMeta);

const NIGHT_TOKEN_ID_FOR_NETWORK = toUnshieldedTokenType(
  NIGHT_TOKEN_ID,
  NETWORK_ID,
);

describe('derivePendingActivityFromMidnightTx', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T03:04:05Z'));
  });

  it('returns a Pending activity with negative Night balance when DApp spends our nightUtxos', () => {
    const ownUtxo = makeUtxo({
      intentHash: 'intent-a',
      outputNo: 0,
      value: 5_000_000n,
    });
    const tx = makeTx([
      {
        guaranteed: {
          inputs: [
            {
              intentHash: 'intent-a',
              outputNo: 0,
              type: NIGHT_TOKEN_ID,
              value: 5_000_000n,
            },
          ],
          outputs: [
            {
              owner: FOREIGN_ADDRESS_HEX,
              type: NIGHT_TOKEN_ID,
              value: 4_000_000n,
            },
          ],
        },
      },
    ]);

    const activity = derivePendingActivityFromMidnightTx({
      deserializedTx: tx,
      accountId: ACCOUNT_ID,
      ownUserAddressHex: OWN_ADDRESS_HEX,
      nightUtxos: [ownUtxo],
      networkId: NETWORK_ID,
    });

    expect(activity).toEqual({
      accountId: ACCOUNT_ID,
      activityId: TX_HASH,
      timestamp: Date.now(),
      type: 'Pending',
      tokenBalanceChanges: [
        {
          tokenId: NIGHT_TOKEN_ID_FOR_NETWORK,
          amount: BigNumber(-5_000_000n),
        },
      ],
    });
  });

  it('returns a Pending activity with positive Night balance for a pure-receive tx to our address', () => {
    const tx = makeTx([
      {
        guaranteed: {
          inputs: [],
          outputs: [
            {
              owner: OWN_ADDRESS_HEX,
              type: NIGHT_TOKEN_ID,
              value: 7_000_000n,
            },
          ],
        },
      },
    ]);

    const activity = derivePendingActivityFromMidnightTx({
      deserializedTx: tx,
      accountId: ACCOUNT_ID,
      ownUserAddressHex: OWN_ADDRESS_HEX,
      nightUtxos: [],
      networkId: NETWORK_ID,
    });

    expect(activity?.tokenBalanceChanges).toEqual([
      {
        tokenId: NIGHT_TOKEN_ID_FOR_NETWORK,
        amount: BigNumber(7_000_000n),
      },
    ]);
    expect(activity?.type).toBe('Pending');
    expect(activity?.accountId).toBe(ACCOUNT_ID);
    expect(activity?.activityId).toBe(TX_HASH);
  });

  it('nets inputs and outputs for a self-send with change back to our address', () => {
    const ownUtxo = makeUtxo({
      intentHash: 'intent-a',
      outputNo: 0,
      value: 10_000_000n,
    });
    const tx = makeTx([
      {
        guaranteed: {
          inputs: [
            {
              intentHash: 'intent-a',
              outputNo: 0,
              type: NIGHT_TOKEN_ID,
              value: 10_000_000n,
            },
          ],
          outputs: [
            {
              owner: FOREIGN_ADDRESS_HEX,
              type: NIGHT_TOKEN_ID,
              value: 3_000_000n,
            },
            {
              owner: OWN_ADDRESS_HEX,
              type: NIGHT_TOKEN_ID,
              value: 6_500_000n,
            },
          ],
        },
      },
    ]);

    const activity = derivePendingActivityFromMidnightTx({
      deserializedTx: tx,
      accountId: ACCOUNT_ID,
      ownUserAddressHex: OWN_ADDRESS_HEX,
      nightUtxos: [ownUtxo],
      networkId: NETWORK_ID,
    });

    expect(activity?.tokenBalanceChanges).toEqual([
      {
        tokenId: NIGHT_TOKEN_ID_FOR_NETWORK,
        amount: BigNumber(-3_500_000n),
      },
    ]);
  });

  it('returns activity with empty tokenBalanceChanges when account is touched but Night net is zero', () => {
    const ownUtxo = makeUtxo({
      intentHash: 'intent-a',
      outputNo: 0,
      value: 2_000_000n,
    });
    const tx = makeTx([
      {
        guaranteed: {
          inputs: [
            {
              intentHash: 'intent-a',
              outputNo: 0,
              type: NIGHT_TOKEN_ID,
              value: 2_000_000n,
            },
          ],
          outputs: [
            {
              owner: OWN_ADDRESS_HEX,
              type: NIGHT_TOKEN_ID,
              value: 2_000_000n,
            },
          ],
        },
      },
    ]);

    const activity = derivePendingActivityFromMidnightTx({
      deserializedTx: tx,
      accountId: ACCOUNT_ID,
      ownUserAddressHex: OWN_ADDRESS_HEX,
      nightUtxos: [ownUtxo],
      networkId: NETWORK_ID,
    });

    expect(activity).toEqual({
      accountId: ACCOUNT_ID,
      activityId: TX_HASH,
      timestamp: Date.now(),
      type: 'Pending',
      tokenBalanceChanges: [],
    });
  });

  it('returns undefined when the tx involves neither our inputs nor our outputs', () => {
    const tx = makeTx([
      {
        guaranteed: {
          inputs: [
            {
              intentHash: 'intent-foreign',
              outputNo: 0,
              type: NIGHT_TOKEN_ID,
              value: 1_000_000n,
            },
          ],
          outputs: [
            {
              owner: FOREIGN_ADDRESS_HEX,
              type: NIGHT_TOKEN_ID,
              value: 900_000n,
            },
          ],
        },
      },
    ]);

    const activity = derivePendingActivityFromMidnightTx({
      deserializedTx: tx,
      accountId: ACCOUNT_ID,
      ownUserAddressHex: OWN_ADDRESS_HEX,
      nightUtxos: [
        makeUtxo({ intentHash: 'other-utxo', outputNo: 0, value: 1n }),
      ],
      networkId: NETWORK_ID,
    });

    expect(activity).toBeUndefined();
  });

  it('ignores non-Night token types when computing balance change but still reports involvement', () => {
    const ownUtxo = makeUtxo({
      intentHash: 'intent-a',
      outputNo: 0,
      value: 42n,
      type: OTHER_TOKEN_TYPE,
    });
    const tx = makeTx([
      {
        guaranteed: {
          inputs: [
            {
              intentHash: 'intent-a',
              outputNo: 0,
              type: OTHER_TOKEN_TYPE,
              value: 42n,
            },
          ],
          outputs: [
            {
              owner: FOREIGN_ADDRESS_HEX,
              type: OTHER_TOKEN_TYPE,
              value: 42n,
            },
          ],
        },
      },
    ]);

    const activity = derivePendingActivityFromMidnightTx({
      deserializedTx: tx,
      accountId: ACCOUNT_ID,
      ownUserAddressHex: OWN_ADDRESS_HEX,
      nightUtxos: [ownUtxo],
      networkId: NETWORK_ID,
    });

    expect(activity).toEqual({
      accountId: ACCOUNT_ID,
      activityId: TX_HASH,
      timestamp: Date.now(),
      type: 'Pending',
      tokenBalanceChanges: [],
    });
  });

  it('walks both guaranteed and fallible offers across all intents', () => {
    const ownUtxo1 = makeUtxo({
      intentHash: 'intent-a',
      outputNo: 0,
      value: 1_000_000n,
    });
    const ownUtxo2 = makeUtxo({
      intentHash: 'intent-b',
      outputNo: 3,
      value: 2_000_000n,
    });
    const tx = makeTx([
      {
        guaranteed: {
          inputs: [
            {
              intentHash: 'intent-a',
              outputNo: 0,
              type: NIGHT_TOKEN_ID,
              value: 1_000_000n,
            },
          ],
          outputs: [
            {
              owner: OWN_ADDRESS_HEX,
              type: NIGHT_TOKEN_ID,
              value: 500_000n,
            },
          ],
        },
      },
      {
        fallible: {
          inputs: [
            {
              intentHash: 'intent-b',
              outputNo: 3,
              type: NIGHT_TOKEN_ID,
              value: 2_000_000n,
            },
          ],
          outputs: [],
        },
      },
    ]);

    const activity = derivePendingActivityFromMidnightTx({
      deserializedTx: tx,
      accountId: ACCOUNT_ID,
      ownUserAddressHex: OWN_ADDRESS_HEX,
      nightUtxos: [ownUtxo1, ownUtxo2],
      networkId: NETWORK_ID,
    });

    expect(activity?.tokenBalanceChanges).toEqual([
      {
        tokenId: NIGHT_TOKEN_ID_FOR_NETWORK,
        amount: BigNumber(-2_500_000n),
      },
    ]);
  });

  it('returns undefined when the tx has no intents', () => {
    const tx = {
      intents: undefined,
      transactionHash: () => TX_HASH,
    } as unknown as ledger.Transaction<
      ledger.SignatureEnabled,
      ledger.Proof,
      ledger.Binding
    >;

    const activity = derivePendingActivityFromMidnightTx({
      deserializedTx: tx,
      accountId: ACCOUNT_ID,
      ownUserAddressHex: OWN_ADDRESS_HEX,
      nightUtxos: [],
      networkId: NETWORK_ID,
    });

    expect(activity).toBeUndefined();
  });
});
