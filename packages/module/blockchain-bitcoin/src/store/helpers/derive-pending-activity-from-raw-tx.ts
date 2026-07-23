import { ActivityType } from '@lace-contract/activities';
import {
  BITCOIN_TOKEN_ID,
  BitcoinNetwork,
} from '@lace-contract/bitcoin-context';
import { BigNumber, Timestamp } from '@lace-lib/util';
import * as bitcoin from 'bitcoinjs-lib';

import type { Activity } from '@lace-contract/activities';
import type {
  BitcoinInFlightOutpoint,
  BitcoinInFlightUtxoActivityMetadata,
  BitcoinUTxO,
} from '@lace-contract/bitcoin-context';
import type { AccountId } from '@lace-contract/wallet-repo';

type DerivePendingActivityFromRawTxParams = {
  rawTxHex: string;
  network: BitcoinNetwork;
  accountId: AccountId;
  accountAddresses: ReadonlySet<string>;
  accountUtxos: readonly BitcoinUTxO[];
};

export const derivePendingActivityFromRawTx = ({
  rawTxHex,
  network,
  accountId,
  accountAddresses,
  accountUtxos,
}: DerivePendingActivityFromRawTxParams): Activity | undefined => {
  const tx = bitcoin.Transaction.fromHex(rawTxHex);
  const bitcoinNetwork =
    network === BitcoinNetwork.Mainnet
      ? bitcoin.networks.bitcoin
      : bitcoin.networks.testnet;
  const txId = tx.getId();

  const ownUtxoByOutpoint = new Map<string, BitcoinUTxO>();
  for (const utxo of accountUtxos) {
    ownUtxoByOutpoint.set(`${utxo.txId}#${utxo.index}`, utxo);
  }

  let ownInputTotal = 0;
  let hasOwnInput = false;
  const consumedInputs: BitcoinInFlightOutpoint[] = [];
  for (const input of tx.ins) {
    const inputTxId = Buffer.from(input.hash).reverse().toString('hex');
    const inputIndex = input.index;
    consumedInputs.push({ txId: inputTxId, index: inputIndex });

    const own = ownUtxoByOutpoint.get(`${inputTxId}#${inputIndex}`);
    if (own) {
      ownInputTotal += own.satoshis;
      hasOwnInput = true;
    }
  }

  let ownOutputTotal = 0;
  let hasOwnOutput = false;
  const producedOutputs: BitcoinUTxO[] = [];
  for (const [index, output] of tx.outs.entries()) {
    let outputAddress: string | undefined;
    try {
      outputAddress = bitcoin.address.fromOutputScript(
        output.script,
        bitcoinNetwork,
      );
    } catch {
      continue;
    }

    producedOutputs.push({
      txId,
      index,
      satoshis: output.value,
      address: outputAddress,
      script: Buffer.from(output.script).toString('hex'),
      confirmations: 0,
      height: 0,
      runes: [],
      inscriptions: [],
    });

    if (accountAddresses.has(outputAddress)) {
      ownOutputTotal += output.value;
      hasOwnOutput = true;
    }
  }

  if (!hasOwnInput && !hasOwnOutput) {
    return undefined;
  }

  const bitcoinInFlight: BitcoinInFlightUtxoActivityMetadata = {
    consumedInputs,
    producedOutputs,
  };

  const netAmount = BigInt(ownOutputTotal - ownInputTotal);

  return {
    accountId,
    activityId: txId,
    timestamp: Timestamp(Date.now()),
    tokenBalanceChanges:
      netAmount === 0n
        ? []
        : [{ tokenId: BITCOIN_TOKEN_ID, amount: BigNumber(netAmount) }],
    type: ActivityType.Pending,
    blockchainSpecific: { Bitcoin: bitcoinInFlight },
  };
};
