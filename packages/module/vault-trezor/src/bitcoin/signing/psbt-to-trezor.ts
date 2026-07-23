import {
  BitcoinNetwork,
  bitcoinFullDerivationPath,
} from '@lace-contract/bitcoin-context';
import * as bitcoin from 'bitcoinjs-lib';

import { coinNameFor } from '../coin-name';

import type {
  TrezorRefTransaction,
  TrezorSignTransactionParams,
  TrezorTxInput,
  TrezorTxOutput,
} from '../../trezor-bitcoin-connect';
import type { BitcoinUnsignedTxDto } from '@lace-contract/bitcoin-context';

export interface PsbtToTrezorProps {
  /** Device master fingerprint (xfp) as 8-char lowercase hex. */
  masterFingerprint: string;
  network: BitcoinNetwork;
}

const HARDENED_OFFSET = 0x80_00_00_00;

/**
 * Converts a serialized BIP-32 path ("m/84'/0'/0'/1/2") into Trezor's numeric
 * address_n form, offsetting hardened segments by 0x80000000. Throws on a
 * malformed segment: a silently skipped or misparsed segment would derive a
 * key for the wrong address.
 */
const pathToAddressN = (path: string): number[] =>
  path
    .replace(/^m\//, '')
    .split('/')
    .map(segment => {
      const isHardened = segment.endsWith("'");
      const index = Number.parseInt(
        isHardened ? segment.slice(0, -1) : segment,
        10,
      );
      if (Number.isNaN(index)) {
        throw new Error(`Malformed BIP-32 derivation path: ${path}`);
      }
      return isHardened ? index + HARDENED_OFFSET : index;
    });

/** Transaction id (display order) from an internal-order hash. */
const txidFromHash = (hash: Uint8Array): string =>
  Buffer.from(hash).reverse().toString('hex');

const bitcoinJsNetworkFor = (network: BitcoinNetwork): bitcoin.Network =>
  network === BitcoinNetwork.Mainnet
    ? bitcoin.networks.bitcoin
    : bitcoin.networks.testnet;

/**
 * Maps each PSBT input to Trezor's input model: previous outpoint in display
 * order, the amount from the input's witnessUtxo, and the full native-segwit
 * derivation path of the matching DTO signer entry (one per input, in input
 * order).
 */
const mapInputs = (
  psbt: bitcoin.Psbt,
  signers: BitcoinUnsignedTxDto['signers'],
): TrezorTxInput[] => {
  if (signers.length !== psbt.txInputs.length) {
    throw new Error(
      `Unsigned transaction has ${psbt.txInputs.length} inputs but ${signers.length} signer entries`,
    );
  }
  return psbt.txInputs.map((txInput, index) => {
    const witnessUtxo = psbt.data.inputs[index].witnessUtxo;
    if (!witnessUtxo) {
      throw new Error(`PSBT input ${index} is missing its witnessUtxo`);
    }
    return {
      prev_hash: txidFromHash(txInput.hash),
      prev_index: txInput.index,
      amount: witnessUtxo.value.toString(),
      address_n: pathToAddressN(bitcoinFullDerivationPath(signers[index])),
      script_type: 'SPENDWITNESS',
      sequence: txInput.sequence,
    };
  });
};

/** Hex of the data pushed by an OP_RETURN output script. */
const opReturnData = (script: Buffer): string => {
  const chunks = bitcoin.script.decompile(script) ?? [];
  return Buffer.concat(
    chunks.filter((chunk): chunk is Buffer => Buffer.isBuffer(chunk)),
  ).toString('hex');
};

/**
 * Maps each PSBT output to Trezor's output model. The change output is the
 * one with a builder-stamped bip32Derivation entry carrying OUR master
 * fingerprint; it is sent by path so the device verifies it against its own
 * seed. An output stamped only with foreign fingerprints is treated as a
 * plain spend.
 */
const mapOutputs = (
  psbt: bitcoin.Psbt,
  props: PsbtToTrezorProps,
): TrezorTxOutput[] => {
  const fingerprint = Buffer.from(props.masterFingerprint, 'hex');
  const network = bitcoinJsNetworkFor(props.network);

  return psbt.txOutputs.map((txOutput, index) => {
    const derivation = psbt.data.outputs[index]?.bip32Derivation?.find(entry =>
      Buffer.from(entry.masterFingerprint).equals(fingerprint),
    );
    if (derivation) {
      return {
        address_n: pathToAddressN(derivation.path),
        amount: txOutput.value.toString(),
        script_type: 'PAYTOWITNESS',
      };
    }
    if (txOutput.script[0] === bitcoin.opcodes.OP_RETURN) {
      return {
        op_return_data: opReturnData(txOutput.script),
        amount: '0',
        script_type: 'PAYTOOPRETURN',
      };
    }
    return {
      address: bitcoin.address.fromOutputScript(txOutput.script, network),
      amount: txOutput.value.toString(),
      script_type: 'PAYTOADDRESS',
    };
  });
};

/**
 * Builds the previous transactions Trezor requires alongside segwit inputs
 * from the nonWitnessUtxo Lace embeds into every hardware-account PSBT input,
 * deduped by txid. Throws when an input lacks its previous transaction.
 */
const buildRefTxs = (psbt: bitcoin.Psbt): TrezorRefTransaction[] => {
  const byTxid = new Map<string, TrezorRefTransaction>();

  psbt.data.inputs.forEach((input, index) => {
    if (!input.nonWitnessUtxo) {
      throw new Error(
        `PSBT input ${index} is missing its previous transaction (nonWitnessUtxo)`,
      );
    }
    const tx = bitcoin.Transaction.fromBuffer(input.nonWitnessUtxo);
    const txid = tx.getId();
    if (byTxid.has(txid)) {
      return;
    }
    byTxid.set(txid, {
      hash: txid,
      version: tx.version,
      lock_time: tx.locktime,
      inputs: tx.ins.map(txIn => ({
        prev_hash: txidFromHash(txIn.hash),
        prev_index: txIn.index,
        script_sig: txIn.script.toString('hex'),
        sequence: txIn.sequence,
      })),
      bin_outputs: tx.outs.map(txOut => ({
        amount: txOut.value.toString(),
        script_pubkey: txOut.script.toString('hex'),
      })),
    });
  });

  return [...byTxid.values()];
};

/**
 * Translates Lace's unsigned Bitcoin transaction DTO into Trezor's
 * input/output signTransaction params. Trezor has no PSBT API, so the PSBT is
 * decoded and re-expressed: inputs spend by derivation path, change returns
 * by derivation path, everything else pays by address, and every referenced
 * previous transaction is supplied so the device verifies input amounts
 * offline. Version, locktime and input sequences are carried over so the
 * device signs the exact transaction the builder produced instead of the
 * firmware defaults.
 */
export const toTrezorSignTransactionParams = (
  dto: BitcoinUnsignedTxDto,
  props: PsbtToTrezorProps,
): TrezorSignTransactionParams => {
  const psbt = bitcoin.Psbt.fromHex(dto.context);

  return {
    coin: coinNameFor(props.network),
    inputs: mapInputs(psbt, dto.signers),
    outputs: mapOutputs(psbt, props),
    refTxs: buildRefTxs(psbt),
    version: psbt.version,
    locktime: psbt.locktime,
  };
};
