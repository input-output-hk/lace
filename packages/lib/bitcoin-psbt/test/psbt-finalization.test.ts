import * as bitcoin from 'bitcoinjs-lib';
import { describe, expect, it } from 'vitest';

import { finalizePsbtWithRawTransaction } from '../src/psbt-finalization';

const network = bitcoin.networks.bitcoin;
const PUBKEY = Buffer.from(
  '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
  'hex',
);

const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: PUBKEY, network });

const createPsbt = () => {
  const psbt = new bitcoin.Psbt({ network });
  psbt.addInput({
    hash: Buffer.alloc(32, 1),
    index: 0,
    witnessUtxo: { script: p2wpkh.output!, value: 10_000 },
  });
  psbt.addOutput({ address: p2wpkh.address!, value: 9000 });
  return psbt;
};

const unsignedTransactionOf = (psbt: bitcoin.Psbt) =>
  bitcoin.Transaction.fromBuffer(psbt.data.globalMap.unsignedTx.toBuffer());

describe('finalizePsbtWithRawTransaction', () => {
  it('copies the raw transaction witness onto the PSBT as finalScriptWitness', () => {
    const psbt = createPsbt();
    const signature = Buffer.alloc(72, 2);
    const transaction = unsignedTransactionOf(psbt);
    transaction.ins[0].witness = [signature, PUBKEY];

    const finalizedBase64 = finalizePsbtWithRawTransaction(
      psbt.toBase64(),
      transaction.toHex(),
      network,
    );

    const finalized = bitcoin.Psbt.fromBase64(finalizedBase64, { network });
    const extracted = finalized.extractTransaction(true);
    expect(extracted.ins[0].witness).toEqual([signature, PUBKEY]);
    expect(extracted.getId()).toBe(transaction.getId());
  });

  it('rejects a raw transaction whose output value differs from the PSBT', () => {
    const psbt = createPsbt();
    const transaction = unsignedTransactionOf(psbt);
    transaction.ins[0].witness = [Buffer.alloc(72, 2), PUBKEY];
    transaction.outs[0].value = 8000;

    expect(() =>
      finalizePsbtWithRawTransaction(
        psbt.toBase64(),
        transaction.toHex(),
        network,
      ),
    ).toThrow('output 0 differs');
  });

  it('rejects a raw transaction whose output script differs from the PSBT', () => {
    const psbt = createPsbt();
    const transaction = unsignedTransactionOf(psbt);
    transaction.ins[0].witness = [Buffer.alloc(72, 2), PUBKEY];
    transaction.outs[0].script = bitcoin.payments.p2wpkh({
      network,
      pubkey: Buffer.from(
        '03fff97bd5755eeea420453a14355235d382f6472f8568a18b2f057a1460297556',
        'hex',
      ),
    }).output!;

    expect(() =>
      finalizePsbtWithRawTransaction(
        psbt.toBase64(),
        transaction.toHex(),
        network,
      ),
    ).toThrow('output 0 differs');
  });

  it('rejects a raw transaction carrying an extra output', () => {
    const psbt = createPsbt();
    const transaction = unsignedTransactionOf(psbt);
    transaction.ins[0].witness = [Buffer.alloc(72, 2), PUBKEY];
    transaction.addOutput(p2wpkh.output!, 500);

    expect(() =>
      finalizePsbtWithRawTransaction(
        psbt.toBase64(),
        transaction.toHex(),
        network,
      ),
    ).toThrow('2 outputs but the PSBT has 1');
  });

  it('rejects a raw transaction whose locktime differs from the PSBT', () => {
    const psbt = createPsbt();
    const transaction = unsignedTransactionOf(psbt);
    transaction.ins[0].witness = [Buffer.alloc(72, 2), PUBKEY];
    transaction.locktime = 500_000;

    expect(() =>
      finalizePsbtWithRawTransaction(
        psbt.toBase64(),
        transaction.toHex(),
        network,
      ),
    ).toThrow('locktime 500000 but the PSBT has 0');
  });

  it('rejects a raw transaction whose version differs from the PSBT', () => {
    const psbt = createPsbt();
    const transaction = unsignedTransactionOf(psbt);
    transaction.ins[0].witness = [Buffer.alloc(72, 2), PUBKEY];
    transaction.version = 1;

    expect(() =>
      finalizePsbtWithRawTransaction(
        psbt.toBase64(),
        transaction.toHex(),
        network,
      ),
    ).toThrow('version 1 but the PSBT has 2');
  });

  it('copies a legacy scriptSig onto the PSBT as finalScriptSig', () => {
    const psbt = new bitcoin.Psbt({ network });
    psbt.addInput({ hash: Buffer.alloc(32, 1), index: 0 });
    psbt.addOutput({ address: p2wpkh.address!, value: 9000 });
    const transaction = unsignedTransactionOf(psbt);
    const scriptSig = bitcoin.script.compile([Buffer.alloc(71, 4), PUBKEY]);
    transaction.ins[0].script = scriptSig;

    const finalizedBase64 = finalizePsbtWithRawTransaction(
      psbt.toBase64(),
      transaction.toHex(),
      network,
    );

    const finalized = bitcoin.Psbt.fromBase64(finalizedBase64, { network });
    expect(finalized.data.inputs[0].finalScriptSig).toEqual(scriptSig);
  });

  it('serializes witness items longer than 252 bytes with an extended varint', () => {
    const psbt = createPsbt();
    const largeItem = Buffer.alloc(300, 5);
    const transaction = unsignedTransactionOf(psbt);
    transaction.ins[0].witness = [largeItem, PUBKEY];

    const finalizedBase64 = finalizePsbtWithRawTransaction(
      psbt.toBase64(),
      transaction.toHex(),
      network,
    );

    const finalized = bitcoin.Psbt.fromBase64(finalizedBase64, { network });
    expect(finalized.extractTransaction(true).ins[0].witness).toEqual([
      largeItem,
      PUBKEY,
    ]);
  });

  it('serializes witness items longer than 65535 bytes with a 32-bit varint', () => {
    const psbt = createPsbt();
    const hugeItem = Buffer.alloc(70_000, 6);
    const transaction = unsignedTransactionOf(psbt);
    transaction.ins[0].witness = [hugeItem];

    const finalizedBase64 = finalizePsbtWithRawTransaction(
      psbt.toBase64(),
      transaction.toHex(),
      network,
    );

    const finalized = bitcoin.Psbt.fromBase64(finalizedBase64, { network });
    expect(finalized.extractTransaction(true).ins[0].witness).toEqual([
      hugeItem,
    ]);
  });

  it('throws when the raw transaction input count differs from the PSBT', () => {
    const psbt = createPsbt();
    const transaction = unsignedTransactionOf(psbt);
    transaction.addInput(Buffer.alloc(32, 9), 1);

    expect(() =>
      finalizePsbtWithRawTransaction(
        psbt.toBase64(),
        transaction.toHex(),
        network,
      ),
    ).toThrow('Signed transaction has 2 inputs but the PSBT has 1');
  });

  it('throws when a raw transaction input spends a different outpoint', () => {
    const psbt = createPsbt();
    const transaction = unsignedTransactionOf(psbt);
    transaction.ins[0].index = 5;
    transaction.ins[0].witness = [PUBKEY];

    expect(() =>
      finalizePsbtWithRawTransaction(
        psbt.toBase64(),
        transaction.toHex(),
        network,
      ),
    ).toThrow('spends a different outpoint');
  });

  it('throws when an input carries neither scriptSig nor witness', () => {
    const psbt = createPsbt();
    const transaction = unsignedTransactionOf(psbt);

    expect(() =>
      finalizePsbtWithRawTransaction(
        psbt.toBase64(),
        transaction.toHex(),
        network,
      ),
    ).toThrow('carries no signature data');
  });
});
