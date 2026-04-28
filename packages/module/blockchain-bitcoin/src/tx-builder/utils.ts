import {
  BitcoinNetwork,
  BitcoinTransactionStatus,
} from '@lace-contract/bitcoin-context';
import * as bitcoin from 'bitcoinjs-lib';

import type { InputResolver } from '../providers';
import type { BitcoinTransactionHistoryEntry } from '@lace-contract/bitcoin-context';

/**
 * Converts a raw transaction hex into a BitcoinTransactionHistoryEntry using an InputResolver to fetch additional input details.
 *
 * This function deserializes a raw Bitcoin transaction hex and transforms it into a transaction history entry.
 * It uses an InputResolver to asynchronously fetch and include details about each input, such as the associated address
 * and the amount of satoshis, which are not directly available from the transaction input script.
 *
 * @param {string} raw - The raw hexadecimal string of the Bitcoin transaction.
 * @param {BitcoinNetwork} network - The Bitcoin network (Mainnet or Testnet) that the transaction pertains to.
 * @param {InputResolver} inputResolver - An instance of InputResolver to fetch additional input details.
 * @returns {Promise<BitcoinTransactionHistoryEntry>} A promise that resolves to a detailed transaction history entry.
 */
export const historyEntryFromRawTx = async (
  raw: string,
  network: BitcoinNetwork,
  inputResolver: InputResolver,
): Promise<BitcoinTransactionHistoryEntry> => {
  const tx = bitcoin.Transaction.fromHex(raw);
  const bitcoinNetwork =
    network === BitcoinNetwork.Mainnet
      ? bitcoin.networks.bitcoin
      : bitcoin.networks.testnet;

  const resolvedInputs = await Promise.all(
    tx.ins.map(async input => {
      const txId = Buffer.from(input.hash).reverse().toString('hex');
      const index = input.index;
      try {
        const resolved = await inputResolver.resolve(txId, index);
        return {
          ...resolved,
          isCoinbase: false,
        };
      } catch {
        return {
          txId,
          index,
          address: '',
          satoshis: 0,
          isCoinbase: false,
        };
      }
    }),
  );

  const resolvedOutputs = tx.outs.map(o => {
    const chunks = bitcoin.script.decompile(o.script);
    const isNullData = chunks && chunks[0] === bitcoin.opcodes.OP_RETURN;

    if (isNullData) {
      const payloadChunks = chunks.slice(1).filter(c => Buffer.isBuffer(c));

      const opReturnData = Buffer.concat(payloadChunks).toString('utf8');

      return {
        address: '',
        satoshis: o.value,
        opReturnData,
      };
    }

    const address = bitcoin.address.fromOutputScript(o.script, bitcoinNetwork);
    return { address, satoshis: o.value };
  });

  return {
    inputs: resolvedInputs,
    outputs: resolvedOutputs,
    transactionHash: tx.getId(),
    confirmations: 0,
    status: BitcoinTransactionStatus.Pending,
    blockHeight: 0,
    timestamp: 0,
  };
};
