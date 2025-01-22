import { UTxO } from '../providers';
import { BitcoinSigner } from './BitcoinSigner';
import { payments, Psbt } from 'bitcoinjs-lib';
import { Network } from '../common';
import * as bitcoin from 'bitcoinjs-lib';

const INPUT_SIZE = 68;
const OUTPUT_SIZE = 34;
const TRANSACTION_OVERHEAD = 10;

export const buildTx = (
  toAddress: string,
  changeAddress: string,
  amount: bigint,
  feeRate: number,
  utxos: UTxO[],
  signer: BitcoinSigner,
  network: Network
): string => {
  const net = network === Network.Mainnet ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;

  try {
    if (!utxos || utxos.length === 0) {
      throw new Error('No UTXOs available to fund the transaction.');
    }

    let inputSum = BigInt(0);
    const selectedUTxOs: UTxO[] = [];

    // Convert feeRate from BTC per kilobyte to satoshis per byte
    const feeRateSatoshis = (feeRate * 100_000_000) / 1_000;

    for (const utxo of utxos) {
      selectedUTxOs.push(utxo);
      inputSum += utxo.amount;

      const estimatedSize = (selectedUTxOs.length * INPUT_SIZE) + (2 * OUTPUT_SIZE) + TRANSACTION_OVERHEAD;
      const fee = BigInt(Math.ceil(estimatedSize * feeRateSatoshis));

      if (inputSum >= amount + fee) break;
    }

    const estimatedSize = (selectedUTxOs.length * INPUT_SIZE) + (2 * OUTPUT_SIZE) + TRANSACTION_OVERHEAD;
    const fee = BigInt(Math.ceil(estimatedSize * feeRateSatoshis));

    console.log('fee:', fee);
    if (inputSum < amount + fee) {
      throw new Error('Insufficient funds to cover the transaction and fees.');
    }

    const publicKey = signer.getPublicKey();
    const psbt = new Psbt({ network: net });

    selectedUTxOs.forEach((utxo) => {
      psbt.addInput({
        hash: utxo.txId,
        index: utxo.index,
        witnessUtxo: {
          script: payments.p2wpkh({ pubkey: publicKey, network: net }).output!,
          value: Number(utxo.amount)
        }
      });
    });

    psbt.addOutput({
      address: toAddress,
      value: Number(amount)
    });

    const change = inputSum - amount - fee;
    if (change > BigInt(0)) {
      psbt.addOutput({
        address: changeAddress,
        value: Number(change)
      });
    }

    psbt.signAllInputs(signer);
    psbt.finalizeAllInputs();

    return psbt.extractTransaction().toHex();
  } catch (error) {
    console.error('Failed to build transaction:', error);
    throw error;
  }
};
