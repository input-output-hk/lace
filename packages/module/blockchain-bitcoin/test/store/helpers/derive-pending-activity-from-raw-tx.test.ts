import { ActivityType } from '@lace-contract/activities';
import {
  BITCOIN_TOKEN_ID,
  BitcoinNetwork,
} from '@lace-contract/bitcoin-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-sdk/util';
import * as bitcoin from 'bitcoinjs-lib';
import { describe, expect, it } from 'vitest';

import { derivePendingActivityFromRawTx } from '../../../src/store/helpers/derive-pending-activity-from-raw-tx';

import type {
  BitcoinInFlightUtxoActivityMetadata,
  BitcoinUTxO,
} from '@lace-contract/bitcoin-context';

const testAccountId = AccountId('test-account');

const ownAddress = 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf';
const foreignAddress = 'tb1qujrdfmuk7xe7rmx8zzk5n6gyxhz8p84ynwv9l2';

const previousTxIdA =
  '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58';
const previousTxIdB =
  '4c4e67bafa15e742c13c592b65c8f74c769cd7d9af04c848099672d1ba391b49';

const makeUtxo = ({
  txId,
  index,
  satoshis,
  address = ownAddress,
}: {
  txId: string;
  index: number;
  satoshis: number;
  address?: string;
}): BitcoinUTxO => ({
  txId,
  index,
  satoshis,
  address,
  script: '',
  confirmations: 1,
  height: 0,
  runes: [],
  inscriptions: [],
});

const outputScriptForAddress = (address: string): Buffer =>
  bitcoin.address.toOutputScript(address, bitcoin.networks.testnet);

const buildRawTxHex = (
  inputs: readonly { txId: string; index: number }[],
  outputs: readonly { script: Buffer; value: number }[],
): string => {
  const tx = new bitcoin.Transaction();
  for (const input of inputs) {
    const previousHashLE = Buffer.from(input.txId, 'hex').reverse();
    tx.addInput(previousHashLE, input.index);
  }
  for (const output of outputs) {
    tx.addOutput(output.script, output.value);
  }
  return tx.toHex();
};

const getBitcoinInFlight = (
  blockchainSpecific: unknown,
): BitcoinInFlightUtxoActivityMetadata | undefined =>
  (blockchainSpecific as { Bitcoin?: BitcoinInFlightUtxoActivityMetadata })
    ?.Bitcoin;

describe('derivePendingActivityFromRawTx', () => {
  it('returns undefined when tx does not involve the account', () => {
    const rawTxHex = buildRawTxHex(
      [{ txId: previousTxIdA, index: 0 }],
      [
        {
          script: outputScriptForAddress(foreignAddress),
          value: 1_000_000,
        },
      ],
    );

    const result = derivePendingActivityFromRawTx({
      rawTxHex,
      network: BitcoinNetwork.Testnet,
      accountId: testAccountId,
      accountAddresses: new Set([ownAddress]),
      accountUtxos: [],
    });

    expect(result).toBeUndefined();
  });

  it('records ALL inputs (own and foreign) in consumedInputs', () => {
    const ownUtxo = makeUtxo({
      txId: previousTxIdA,
      index: 0,
      satoshis: 10_000_000,
    });
    const rawTxHex = buildRawTxHex(
      [
        { txId: previousTxIdA, index: 0 },
        { txId: previousTxIdB, index: 7 },
      ],
      [
        {
          script: outputScriptForAddress(foreignAddress),
          value: 4_000_000,
        },
      ],
    );

    const result = derivePendingActivityFromRawTx({
      rawTxHex,
      network: BitcoinNetwork.Testnet,
      accountId: testAccountId,
      accountAddresses: new Set([ownAddress]),
      accountUtxos: [ownUtxo],
    });

    expect(result).toBeDefined();
    const inFlight = getBitcoinInFlight(result!.blockchainSpecific);
    expect(inFlight!.consumedInputs).toEqual([
      { txId: previousTxIdA, index: 0 },
      { txId: previousTxIdB, index: 7 },
    ]);
  });

  it('records ALL address-decodable outputs (own and foreign) with the new tx id', () => {
    const ownUtxo = makeUtxo({
      txId: previousTxIdA,
      index: 0,
      satoshis: 10_000_000,
    });
    const rawTxHex = buildRawTxHex(
      [{ txId: previousTxIdA, index: 0 }],
      [
        {
          script: outputScriptForAddress(foreignAddress),
          value: 3_000_000,
        },
        {
          script: outputScriptForAddress(ownAddress),
          value: 6_800_000,
        },
      ],
    );

    const expectedTxId = bitcoin.Transaction.fromHex(rawTxHex).getId();

    const result = derivePendingActivityFromRawTx({
      rawTxHex,
      network: BitcoinNetwork.Testnet,
      accountId: testAccountId,
      accountAddresses: new Set([ownAddress]),
      accountUtxos: [ownUtxo],
    });

    const inFlight = getBitcoinInFlight(result!.blockchainSpecific);
    expect(inFlight!.consumedInputs).toEqual([
      { txId: previousTxIdA, index: 0 },
    ]);
    expect(inFlight!.producedOutputs).toEqual([
      {
        txId: expectedTxId,
        index: 0,
        satoshis: 3_000_000,
        address: foreignAddress,
        script: outputScriptForAddress(foreignAddress).toString('hex'),
        confirmations: 0,
        height: 0,
        runes: [],
        inscriptions: [],
      },
      {
        txId: expectedTxId,
        index: 1,
        satoshis: 6_800_000,
        address: ownAddress,
        script: outputScriptForAddress(ownAddress).toString('hex'),
        confirmations: 0,
        height: 0,
        runes: [],
        inscriptions: [],
      },
    ]);
  });

  it('records multiple own outputs in their original order', () => {
    const ownUtxo = makeUtxo({
      txId: previousTxIdA,
      index: 0,
      satoshis: 10_000_000,
    });
    const rawTxHex = buildRawTxHex(
      [{ txId: previousTxIdA, index: 0 }],
      [
        {
          script: outputScriptForAddress(ownAddress),
          value: 2_000_000,
        },
        {
          script: outputScriptForAddress(foreignAddress),
          value: 3_000_000,
        },
        {
          script: outputScriptForAddress(ownAddress),
          value: 4_800_000,
        },
      ],
    );

    const result = derivePendingActivityFromRawTx({
      rawTxHex,
      network: BitcoinNetwork.Testnet,
      accountId: testAccountId,
      accountAddresses: new Set([ownAddress]),
      accountUtxos: [ownUtxo],
    });

    const inFlight = getBitcoinInFlight(result!.blockchainSpecific);
    expect(inFlight!.producedOutputs).toHaveLength(3);
    expect(inFlight!.producedOutputs.map(o => o.index)).toEqual([0, 1, 2]);
    expect(inFlight!.producedOutputs[0].address).toBe(ownAddress);
    expect(inFlight!.producedOutputs[1].address).toBe(foreignAddress);
    expect(inFlight!.producedOutputs[2].address).toBe(ownAddress);
  });

  it('records the foreign output when no output belongs to the account (tx is still relevant via own input)', () => {
    const ownUtxo = makeUtxo({
      txId: previousTxIdA,
      index: 0,
      satoshis: 10_000_000,
    });
    const rawTxHex = buildRawTxHex(
      [{ txId: previousTxIdA, index: 0 }],
      [
        {
          script: outputScriptForAddress(foreignAddress),
          value: 9_800_000,
        },
      ],
    );

    const result = derivePendingActivityFromRawTx({
      rawTxHex,
      network: BitcoinNetwork.Testnet,
      accountId: testAccountId,
      accountAddresses: new Set([ownAddress]),
      accountUtxos: [ownUtxo],
    });

    const inFlight = getBitcoinInFlight(result!.blockchainSpecific);
    expect(inFlight!.consumedInputs).toEqual([
      { txId: previousTxIdA, index: 0 },
    ]);
    expect(inFlight!.producedOutputs).toHaveLength(1);
    expect(inFlight!.producedOutputs[0].address).toBe(foreignAddress);
  });

  it('skips outputs whose script cannot be decoded to an address (e.g. OP_RETURN)', () => {
    const ownUtxo = makeUtxo({
      txId: previousTxIdA,
      index: 0,
      satoshis: 10_000_000,
    });

    const opReturnScript = bitcoin.payments.embed({
      data: [Buffer.from('memo', 'utf8')],
    }).output;
    expect(opReturnScript).toBeDefined();

    const rawTxHex = buildRawTxHex(
      [{ txId: previousTxIdA, index: 0 }],
      [
        {
          script: outputScriptForAddress(ownAddress),
          value: 5_000_000,
        },
        {
          script: opReturnScript!,
          value: 0,
        },
      ],
    );

    const result = derivePendingActivityFromRawTx({
      rawTxHex,
      network: BitcoinNetwork.Testnet,
      accountId: testAccountId,
      accountAddresses: new Set([ownAddress]),
      accountUtxos: [ownUtxo],
    });

    const inFlight = getBitcoinInFlight(result!.blockchainSpecific);
    expect(inFlight!.producedOutputs).toHaveLength(1);
    expect(inFlight!.producedOutputs[0]).toEqual(
      expect.objectContaining({
        index: 0,
        address: ownAddress,
        satoshis: 5_000_000,
      }),
    );
  });

  it('produces a pending Activity with the token balance change', () => {
    const ownUtxo = makeUtxo({
      txId: previousTxIdA,
      index: 0,
      satoshis: 10_000_000,
    });
    const rawTxHex = buildRawTxHex(
      [{ txId: previousTxIdA, index: 0 }],
      [
        {
          script: outputScriptForAddress(foreignAddress),
          value: 3_000_000,
        },
        {
          script: outputScriptForAddress(ownAddress),
          value: 6_800_000,
        },
      ],
    );

    const expectedTxId = bitcoin.Transaction.fromHex(rawTxHex).getId();

    const result = derivePendingActivityFromRawTx({
      rawTxHex,
      network: BitcoinNetwork.Testnet,
      accountId: testAccountId,
      accountAddresses: new Set([ownAddress]),
      accountUtxos: [ownUtxo],
    });

    expect(result?.accountId).toBe(testAccountId);
    expect(result?.activityId).toBe(expectedTxId);
    expect(result?.type).toBe(ActivityType.Pending);
    expect(result?.tokenBalanceChanges).toEqual([
      {
        tokenId: BITCOIN_TOKEN_ID,
        amount: BigNumber(-3_200_000n),
      },
    ]);
  });

  it('omits the token balance change entry when net is zero (foreign input covers fee)', () => {
    const ownUtxo = makeUtxo({
      txId: previousTxIdA,
      index: 0,
      satoshis: 5_000_000,
    });
    // Foreign input not added to accountUtxos, so it isn't counted as own.
    // own in 5_000_000 + foreign in 200_000 → own out 5_000_000 (fee covered by foreign input).
    const rawTxHex = buildRawTxHex(
      [
        { txId: previousTxIdA, index: 0 },
        { txId: previousTxIdB, index: 0 },
      ],
      [
        {
          script: outputScriptForAddress(ownAddress),
          value: 5_000_000,
        },
      ],
    );

    const result = derivePendingActivityFromRawTx({
      rawTxHex,
      network: BitcoinNetwork.Testnet,
      accountId: testAccountId,
      accountAddresses: new Set([ownAddress]),
      accountUtxos: [ownUtxo],
    });

    expect(result).toBeDefined();
    expect(result?.tokenBalanceChanges).toEqual([]);
  });

  it('uses mainnet network to decode output scripts', () => {
    const mainnetOwn = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
    const rawTxHex = buildRawTxHex(
      [{ txId: previousTxIdA, index: 0 }],
      [
        {
          script: bitcoin.address.toOutputScript(
            mainnetOwn,
            bitcoin.networks.bitcoin,
          ),
          value: 5_000_000,
        },
      ],
    );

    const result = derivePendingActivityFromRawTx({
      rawTxHex,
      network: BitcoinNetwork.Mainnet,
      accountId: testAccountId,
      accountAddresses: new Set([mainnetOwn]),
      accountUtxos: [],
    });

    const inFlight = getBitcoinInFlight(result!.blockchainSpecific);
    expect(inFlight!.producedOutputs).toHaveLength(1);
    expect(inFlight!.producedOutputs[0].address).toBe(mainnetOwn);
  });
});
