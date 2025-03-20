/* eslint-disable no-magic-numbers, max-params, no-console, @typescript-eslint/no-non-null-assertion */
import { UTxO } from '../providers';
import { BitcoinSigner } from './BitcoinSigner';
import { payments, Psbt } from 'bitcoinjs-lib';
import { DerivedAddress, Network } from '../common';
import * as bitcoin from 'bitcoinjs-lib';

// TODO: Delete this file

const INPUT_SIZE = 68;
const OUTPUT_SIZE = 34;
const TRANSACTION_OVERHEAD = 10;

export type UnsignedTransaction = {
  context: Psbt;
  toAddress: string;
  amount: bigint;
  fee: bigint;
  vBytes: number;
  signers: DerivedAddress[];
};

export type SignedTransaction = {
  context: Psbt;
  hex: string;
};

/**
 * Signs a PSBT transaction with multiple Bitcoin signers, each corresponding to a specific input.
 *
 * @param unsignedTx - The PSBT transaction to sign.
 * @param signers - An array of BitcoinSigner instances, where each signer is used for the respective input.
 * @returns The signed transaction containing the signed PSBT and its hexadecimal representation.
 */
export const signTx = (unsignedTx: UnsignedTransaction, signers: BitcoinSigner[]): SignedTransaction => {
  const psbt = unsignedTx.context;

  signers.forEach((signer, index) => {
    psbt.signInput(index, signer);
  });

  psbt.finalizeAllInputs();

  return {
    context: psbt,
    hex: psbt.extractTransaction().toHex()
  };
};

export const buildTx = (
  toAddress: string,
  changeAddress: string,
  amount: bigint,
  feeRate: number,
  utxos: UTxO[],
  network: Network,
  knownAddresses: DerivedAddress[]
): UnsignedTransaction => {
  const net = network === Network.Mainnet ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;

  try {
    if (!utxos || utxos.length === 0) {
      throw new Error('No UTXOs available to fund the transaction.');
    }

    let inputSum = BigInt(0);
    const selectedUTxOs: UTxO[] = [];

    // Convert feeRate from BTC per kilobyte to satoshis per byte
    const feeRateSatoshis = (feeRate * 100_000_000) / 1000;

    for (const utxo of utxos) {
      selectedUTxOs.push(utxo);
      inputSum += utxo.satoshis;

      const estimatedSize = selectedUTxOs.length * INPUT_SIZE + 2 * OUTPUT_SIZE + TRANSACTION_OVERHEAD;
      const fee = BigInt(Math.ceil(estimatedSize * feeRateSatoshis));

      if (inputSum >= amount + fee) break;
    }

    const estimatedSize = selectedUTxOs.length * INPUT_SIZE + 2 * OUTPUT_SIZE + TRANSACTION_OVERHEAD;
    const fee = BigInt(Math.ceil(estimatedSize * feeRateSatoshis));

    if (inputSum < amount + fee) {
      throw new Error('Insufficient funds to cover the transaction and fees.');
    }

    const psbt = new Psbt({ network: net });

    const signers = new Array<DerivedAddress>();

    selectedUTxOs.forEach((utxo) => {
      const knownAddr = knownAddresses.find((address) => address.address === utxo.address);
      if (!knownAddr) throw new Error('Unknown address in UTXO set.');

      signers.push(knownAddr);

      psbt.addInput({
        hash: utxo.txId,
        index: utxo.index,
        witnessUtxo: {
          script: payments.p2wpkh({ pubkey: Buffer.from(knownAddr.publicKeyHex, 'hex'), network: net }).output!,
          value: Number(utxo.satoshis)
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

    return { context: psbt, vBytes: estimatedSize, fee, toAddress, amount, signers };
  } catch (error) {
    console.error('Failed to build transaction:', error);
    throw error;
  }
};
