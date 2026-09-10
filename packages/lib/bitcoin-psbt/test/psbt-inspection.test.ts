import * as bitcoin from 'bitcoinjs-lib';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { inspectPsbt, nonDefaultSighashInputs } from '../src/psbt-inspection';

const network = bitcoin.networks.regtest;

const paymentFromHashByte = (fill: number) =>
  bitcoin.payments.p2wpkh({ hash: Buffer.alloc(20, fill), network });

const ownPayment = paymentFromHashByte(1);
const foreignPayment = paymentFromHashByte(2);
const ownAddresses: ReadonlySet<string> = new Set([ownPayment.address!]);

const OWN_TXID = 'ab'.repeat(32);
const FOREIGN_TXID = 'cd'.repeat(32);
const NON_PALINDROMIC_TXID = '01'.repeat(16) + 'ff'.repeat(16);

const buildFundingTx = (script: Buffer, value: number) => {
  const tx = new bitcoin.Transaction();
  tx.version = 2;
  tx.addInput(Buffer.alloc(32, 7), 0);
  tx.addOutput(script, value);
  return tx;
};

const addWitnessInput = (
  psbt: bitcoin.Psbt,
  options: {
    hash: string;
    script: Buffer;
    value: number;
    sighashType?: number;
  },
) => {
  psbt.addInput({
    hash: options.hash,
    index: 0,
    witnessUtxo: { script: options.script, value: options.value },
    ...(options.sighashType === undefined
      ? {}
      : { sighashType: options.sighashType }),
  });
};

describe('inspectPsbt', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('classifies witnessUtxo inputs and outputs as own or foreign and computes fee, fee rate and net balance change', () => {
    const psbt = new bitcoin.Psbt({ network });
    addWitnessInput(psbt, {
      hash: OWN_TXID,
      script: ownPayment.output!,
      value: 60_000,
    });
    addWitnessInput(psbt, {
      hash: FOREIGN_TXID,
      script: foreignPayment.output!,
      value: 40_000,
    });
    psbt.addOutput({ address: foreignPayment.address!, value: 68_000 });
    psbt.addOutput({ address: ownPayment.address!, value: 30_000 });

    const result = inspectPsbt(psbt.toBase64(), { ownAddresses, network });

    expect(result.inputs).toEqual([
      {
        index: 0,
        address: ownPayment.address,
        value: 60_000,
        isOwn: true,
        willSign: true,
        sighashType: undefined,
      },
      {
        index: 1,
        address: foreignPayment.address,
        value: 40_000,
        isOwn: false,
        willSign: false,
        sighashType: undefined,
      },
    ]);
    expect(result.outputs).toEqual([
      {
        index: 0,
        address: foreignPayment.address,
        value: 68_000,
        isOwn: false,
      },
      { index: 1, address: ownPayment.address, value: 30_000, isOwn: true },
    ]);
    expect(result.fee).toBe(2000);
    expect(result.estimatedFeeRate).toBe(9.6);
    expect(result.netBalanceChange).toBe(-30_000);
    expect(result.unresolvedInputs).toEqual([]);
    expect(result.warnings).toEqual({
      nonDefaultSighash: false,
      unresolvedInputValues: false,
      signsForeignInputs: false,
    });
  });

  it('resolves an input from its embedded nonWitnessUtxo when the txid matches', () => {
    const fundingTx = buildFundingTx(ownPayment.output!, 50_000);
    const psbt = new bitcoin.Psbt({ network });
    psbt.addInput({
      hash: fundingTx.getId(),
      index: 0,
      nonWitnessUtxo: fundingTx.toBuffer(),
    });
    psbt.addOutput({ address: foreignPayment.address!, value: 49_000 });

    const result = inspectPsbt(psbt.toBase64(), { ownAddresses, network });

    expect(result.inputs[0]).toEqual({
      index: 0,
      address: ownPayment.address,
      value: 50_000,
      isOwn: true,
      willSign: true,
      sighashType: undefined,
    });
    expect(result.fee).toBe(1000);
    expect(result.unresolvedInputs).toEqual([]);
  });

  it('treats a nonWitnessUtxo whose txid does not match the declared outpoint as unresolved', () => {
    const fundingTx = buildFundingTx(ownPayment.output!, 50_000);
    const psbt = new bitcoin.Psbt({ network });
    psbt.addInput({
      hash: NON_PALINDROMIC_TXID,
      index: 0,
      nonWitnessUtxo: fundingTx.toBuffer(),
    });
    psbt.addOutput({ address: foreignPayment.address!, value: 49_000 });

    const result = inspectPsbt(psbt.toBase64(), { ownAddresses, network });

    expect(result.inputs[0]).toEqual({
      index: 0,
      address: undefined,
      value: undefined,
      isOwn: false,
      willSign: false,
      sighashType: undefined,
    });
    expect(result.unresolvedInputs).toEqual([
      { index: 0, txid: NON_PALINDROMIC_TXID, vout: 0 },
    ]);
    expect(result.fee).toBeUndefined();
    expect(result.warnings.unresolvedInputValues).toBe(true);
  });

  it('treats a nonWitnessUtxo without an output at the declared vout as unresolved', () => {
    const fundingTx = buildFundingTx(ownPayment.output!, 50_000);
    const psbt = new bitcoin.Psbt({ network });
    psbt.addInput({
      hash: fundingTx.getId(),
      index: 5,
      nonWitnessUtxo: fundingTx.toBuffer(),
    });
    psbt.addOutput({ address: foreignPayment.address!, value: 49_000 });

    const result = inspectPsbt(psbt.toBase64(), { ownAddresses, network });

    expect(result.unresolvedInputs).toEqual([
      { index: 0, txid: fundingTx.getId(), vout: 5 },
    ]);
  });

  it('treats a nonWitnessUtxo that does not parse as a transaction as unresolved', () => {
    const psbt = new bitcoin.Psbt({ network });
    psbt.addInput({ hash: OWN_TXID, index: 0 });
    psbt.data.inputs[0].nonWitnessUtxo = Buffer.from('00', 'hex');
    psbt.addOutput({ address: foreignPayment.address!, value: 1000 });

    const result = inspectPsbt(psbt.toBase64(), { ownAddresses, network });

    expect(result.unresolvedInputs).toEqual([
      { index: 0, txid: OWN_TXID, vout: 0 },
    ]);
  });

  it('resolves an input without utxo data from resolvedPrevOuts', () => {
    const psbt = new bitcoin.Psbt({ network });
    psbt.addInput({ hash: NON_PALINDROMIC_TXID, index: 3 });
    psbt.addOutput({ address: foreignPayment.address!, value: 24_000 });

    const result = inspectPsbt(psbt.toBase64(), {
      ownAddresses,
      network,
      resolvedPrevOuts: new Map([
        [
          `${NON_PALINDROMIC_TXID}:3`,
          { value: 25_000, script: ownPayment.output! },
        ],
      ]),
    });

    expect(result.inputs[0]).toEqual({
      index: 0,
      address: ownPayment.address,
      value: 25_000,
      isOwn: true,
      willSign: true,
      sighashType: undefined,
    });
    expect(result.fee).toBe(1000);
    expect(result.unresolvedInputs).toEqual([]);
    expect(result.warnings.unresolvedInputValues).toBe(false);
  });

  it('suppresses fee and fee rate when any input value is unknown but keeps net balance change for unresolved foreign inputs', () => {
    const psbt = new bitcoin.Psbt({ network });
    addWitnessInput(psbt, {
      hash: OWN_TXID,
      script: ownPayment.output!,
      value: 60_000,
    });
    psbt.addInput({ hash: FOREIGN_TXID, index: 1 });
    psbt.addOutput({ address: ownPayment.address!, value: 30_000 });

    const result = inspectPsbt(psbt.toBase64(), { ownAddresses, network });

    expect(result.fee).toBeUndefined();
    expect(result.estimatedFeeRate).toBeUndefined();
    expect(result.netBalanceChange).toBe(-30_000);
    expect(result.warnings.unresolvedInputValues).toBe(true);
  });

  it('suppresses net balance change when an unresolved input is requested for signing', () => {
    const psbt = new bitcoin.Psbt({ network });
    addWitnessInput(psbt, {
      hash: OWN_TXID,
      script: ownPayment.output!,
      value: 60_000,
    });
    psbt.addInput({ hash: FOREIGN_TXID, index: 1 });
    psbt.addOutput({ address: ownPayment.address!, value: 30_000 });

    const result = inspectPsbt(psbt.toBase64(), {
      ownAddresses,
      network,
      toSignInputs: [{ index: 0 }, { index: 1 }],
    });

    expect(result.inputs.map(input => input.willSign)).toEqual([true, true]);
    expect(result.netBalanceChange).toBeUndefined();
    expect(result.warnings.signsForeignInputs).toBe(false);
  });

  it('overrides the own-inputs signing default with toSignInputs and warns about signing foreign inputs', () => {
    const psbt = new bitcoin.Psbt({ network });
    addWitnessInput(psbt, {
      hash: OWN_TXID,
      script: ownPayment.output!,
      value: 60_000,
    });
    addWitnessInput(psbt, {
      hash: FOREIGN_TXID,
      script: foreignPayment.output!,
      value: 40_000,
    });
    psbt.addOutput({ address: ownPayment.address!, value: 99_000 });

    const result = inspectPsbt(psbt.toBase64(), {
      ownAddresses,
      network,
      toSignInputs: [{ index: 1 }],
    });

    expect(result.inputs.map(input => input.willSign)).toEqual([false, true]);
    expect(result.warnings.signsForeignInputs).toBe(true);
  });

  it.each([
    ['SIGHASH_NONE', bitcoin.Transaction.SIGHASH_NONE],
    ['SIGHASH_SINGLE', bitcoin.Transaction.SIGHASH_SINGLE],
    [
      'SIGHASH_ALL | SIGHASH_ANYONECANPAY',
      bitcoin.Transaction.SIGHASH_ALL |
        bitcoin.Transaction.SIGHASH_ANYONECANPAY,
    ],
  ])(
    'warns about a non-default sighash when a signed input uses %s',
    (_name, sighashType) => {
      const psbt = new bitcoin.Psbt({ network });
      addWitnessInput(psbt, {
        hash: OWN_TXID,
        script: ownPayment.output!,
        value: 60_000,
        sighashType,
      });
      psbt.addOutput({ address: foreignPayment.address!, value: 59_000 });

      const result = inspectPsbt(psbt.toBase64(), { ownAddresses, network });

      expect(result.inputs[0].sighashType).toBe(sighashType);
      expect(result.warnings.nonDefaultSighash).toBe(true);
    },
  );

  it('does not warn when a signed input uses SIGHASH_ALL explicitly', () => {
    const psbt = new bitcoin.Psbt({ network });
    addWitnessInput(psbt, {
      hash: OWN_TXID,
      script: ownPayment.output!,
      value: 60_000,
      sighashType: bitcoin.Transaction.SIGHASH_ALL,
    });
    psbt.addOutput({ address: foreignPayment.address!, value: 59_000 });

    const result = inspectPsbt(psbt.toBase64(), { ownAddresses, network });

    expect(result.inputs[0].sighashType).toBe(bitcoin.Transaction.SIGHASH_ALL);
    expect(result.warnings.nonDefaultSighash).toBe(false);
  });

  it('does not warn about a non-default sighash on an input that will not be signed', () => {
    const psbt = new bitcoin.Psbt({ network });
    addWitnessInput(psbt, {
      hash: FOREIGN_TXID,
      script: foreignPayment.output!,
      value: 40_000,
      sighashType: bitcoin.Transaction.SIGHASH_NONE,
    });
    psbt.addOutput({ address: ownPayment.address!, value: 39_000 });

    const result = inspectPsbt(psbt.toBase64(), { ownAddresses, network });

    expect(result.inputs[0].willSign).toBe(false);
    expect(result.warnings.nonDefaultSighash).toBe(false);
  });

  it('takes the sighash from the toSignInputs entry when the PSBT input carries none', () => {
    const psbt = new bitcoin.Psbt({ network });
    addWitnessInput(psbt, {
      hash: OWN_TXID,
      script: ownPayment.output!,
      value: 60_000,
    });
    psbt.addOutput({ address: foreignPayment.address!, value: 59_000 });

    const result = inspectPsbt(psbt.toBase64(), {
      ownAddresses,
      network,
      toSignInputs: [
        { index: 0, sighashTypes: [bitcoin.Transaction.SIGHASH_NONE] },
      ],
    });

    expect(result.inputs[0].sighashType).toBe(bitcoin.Transaction.SIGHASH_NONE);
    expect(result.warnings.nonDefaultSighash).toBe(true);
  });

  it('prefers the PSBT input sighash for display but still warns when the toSignInputs entry allows a non-default sighash', () => {
    const psbt = new bitcoin.Psbt({ network });
    addWitnessInput(psbt, {
      hash: OWN_TXID,
      script: ownPayment.output!,
      value: 60_000,
      sighashType: bitcoin.Transaction.SIGHASH_ALL,
    });
    psbt.addOutput({ address: foreignPayment.address!, value: 59_000 });

    const result = inspectPsbt(psbt.toBase64(), {
      ownAddresses,
      network,
      toSignInputs: [
        { index: 0, sighashTypes: [bitcoin.Transaction.SIGHASH_NONE] },
      ],
    });

    expect(result.inputs[0].sighashType).toBe(bitcoin.Transaction.SIGHASH_ALL);
    expect(result.warnings.nonDefaultSighash).toBe(true);
  });

  it('warns when any element of a toSignInputs sighashTypes array is non-default while displaying the first element', () => {
    const psbt = new bitcoin.Psbt({ network });
    addWitnessInput(psbt, {
      hash: OWN_TXID,
      script: ownPayment.output!,
      value: 60_000,
    });
    psbt.addOutput({ address: foreignPayment.address!, value: 59_000 });

    const result = inspectPsbt(psbt.toBase64(), {
      ownAddresses,
      network,
      toSignInputs: [
        {
          index: 0,
          sighashTypes: [
            bitcoin.Transaction.SIGHASH_ALL,
            bitcoin.Transaction.SIGHASH_NONE,
          ],
        },
      ],
    });

    expect(result.inputs[0].sighashType).toBe(bitcoin.Transaction.SIGHASH_ALL);
    expect(result.warnings.nonDefaultSighash).toBe(true);
  });

  it('tolerates inputs and outputs with scripts that have no address form', () => {
    const opReturnScript = bitcoin.payments.embed({
      data: [Buffer.from('lace')],
    }).output!;
    const psbt = new bitcoin.Psbt({ network });
    addWitnessInput(psbt, {
      hash: OWN_TXID,
      script: Buffer.from('6a04deadbeef', 'hex'),
      value: 1000,
    });
    psbt.addOutput({ script: opReturnScript, value: 0 });
    psbt.addOutput({ address: foreignPayment.address!, value: 500 });

    const result = inspectPsbt(psbt.toBase64(), { ownAddresses, network });

    expect(result.inputs[0]).toEqual({
      index: 0,
      address: undefined,
      value: 1000,
      isOwn: false,
      willSign: false,
      sighashType: undefined,
    });
    expect(result.outputs[0]).toEqual({
      index: 0,
      address: undefined,
      value: 0,
      isOwn: false,
    });
    expect(result.fee).toBe(500);
  });

  it('throws a descriptive error when all input values are known and the outputs total more than the inputs', () => {
    const psbt = new bitcoin.Psbt({ network });
    addWitnessInput(psbt, {
      hash: OWN_TXID,
      script: ownPayment.output!,
      value: 10_000,
    });
    psbt.addOutput({ address: foreignPayment.address!, value: 20_000 });

    expect(() =>
      inspectPsbt(psbt.toBase64(), { ownAddresses, network }),
    ).toThrow(
      'Failed to decode PSBT: output total 20000 exceeds input total 10000',
    );
  });

  it('throws a descriptive error when a toSignInputs index is out of range', () => {
    const psbt = new bitcoin.Psbt({ network });
    addWitnessInput(psbt, {
      hash: OWN_TXID,
      script: ownPayment.output!,
      value: 60_000,
    });
    psbt.addOutput({ address: foreignPayment.address!, value: 59_000 });

    expect(() =>
      inspectPsbt(psbt.toBase64(), {
        ownAddresses,
        network,
        toSignInputs: [{ index: 1 }],
      }),
    ).toThrow(
      'Failed to decode PSBT: toSignInputs index 1 is out of range for 1 inputs',
    );
  });

  it('throws a descriptive error when toSignInputs repeats an input index', () => {
    const psbt = new bitcoin.Psbt({ network });
    addWitnessInput(psbt, {
      hash: OWN_TXID,
      script: ownPayment.output!,
      value: 60_000,
    });
    psbt.addOutput({ address: foreignPayment.address!, value: 59_000 });

    expect(() =>
      inspectPsbt(psbt.toBase64(), {
        ownAddresses,
        network,
        toSignInputs: [{ index: 0 }, { index: 0 }],
      }),
    ).toThrow('Failed to decode PSBT: toSignInputs repeats an input index');
  });

  it('throws a descriptive error for input that is not valid base64', () => {
    expect(() =>
      inspectPsbt('not-a-psbt!!!', { ownAddresses, network }),
    ).toThrow(/^Failed to decode PSBT: /);
  });

  it('throws a descriptive error for base64 that does not encode a PSBT', () => {
    expect(() =>
      inspectPsbt(Buffer.from('garbage bytes').toString('base64'), {
        ownAddresses,
        network,
      }),
    ).toThrow(/^Failed to decode PSBT: /);
  });

  it('stringifies non-Error decode failures into the thrown message', () => {
    vi.spyOn(bitcoin.Psbt, 'fromBase64').mockImplementation(() => {
      throw 'boom' as unknown as Error;
    });

    expect(() => inspectPsbt('irrelevant', { ownAddresses, network })).toThrow(
      'Failed to decode PSBT: boom',
    );
  });
});

describe('nonDefaultSighashInputs', () => {
  const inspect = (
    psbt: bitcoin.Psbt,
    toSignInputs?: Array<{ index: number; sighashTypes?: number[] }>,
  ) => {
    const { inputs } = inspectPsbt(psbt.toBase64(), {
      ownAddresses,
      network,
      toSignInputs,
    });
    return nonDefaultSighashInputs(inputs, toSignInputs);
  };

  const psbtWithOwnInput = (sighashType?: number) => {
    const psbt = new bitcoin.Psbt({ network });
    addWitnessInput(psbt, {
      hash: OWN_TXID,
      script: ownPayment.output!,
      value: 60_000,
      sighashType,
    });
    psbt.addOutput({ address: foreignPayment.address!, value: 59_000 });
    return psbt;
  };

  it.each([
    ['SIGHASH_NONE', bitcoin.Transaction.SIGHASH_NONE],
    ['SIGHASH_SINGLE', bitcoin.Transaction.SIGHASH_SINGLE],
    [
      'SIGHASH_ALL | SIGHASH_ANYONECANPAY',
      bitcoin.Transaction.SIGHASH_ALL |
        bitcoin.Transaction.SIGHASH_ANYONECANPAY,
    ],
  ])('reports an input to be signed with %s', (_name, sighashType) => {
    expect(inspect(psbtWithOwnInput(sighashType))).toEqual([0]);
  });

  it('reports nothing for an input to be signed with SIGHASH_ALL', () => {
    expect(inspect(psbtWithOwnInput(bitcoin.Transaction.SIGHASH_ALL))).toEqual(
      [],
    );
    expect(inspect(psbtWithOwnInput())).toEqual([]);
  });

  it('reports an input whose toSignInputs entry allows a non-default sighash', () => {
    expect(
      inspect(psbtWithOwnInput(bitcoin.Transaction.SIGHASH_ALL), [
        {
          index: 0,
          sighashTypes: [
            bitcoin.Transaction.SIGHASH_ALL,
            bitcoin.Transaction.SIGHASH_SINGLE,
          ],
        },
      ]),
    ).toEqual([0]);
  });

  it('reports nothing for a toSignInputs entry that allows SIGHASH_ALL only', () => {
    expect(
      inspect(psbtWithOwnInput(), [
        { index: 0, sighashTypes: [bitcoin.Transaction.SIGHASH_ALL] },
      ]),
    ).toEqual([]);
  });

  it('reports nothing for a non-default sighash on an input that will not be signed', () => {
    const psbt = new bitcoin.Psbt({ network });
    addWitnessInput(psbt, {
      hash: FOREIGN_TXID,
      script: foreignPayment.output!,
      value: 40_000,
      sighashType: bitcoin.Transaction.SIGHASH_NONE,
    });
    psbt.addOutput({ address: ownPayment.address!, value: 39_000 });

    expect(inspect(psbt)).toEqual([]);
  });

  it('reports every offending index of a multi-input PSBT', () => {
    const psbt = new bitcoin.Psbt({ network });
    addWitnessInput(psbt, {
      hash: OWN_TXID,
      script: ownPayment.output!,
      value: 60_000,
      sighashType: bitcoin.Transaction.SIGHASH_SINGLE,
    });
    addWitnessInput(psbt, {
      hash: NON_PALINDROMIC_TXID,
      script: ownPayment.output!,
      value: 20_000,
      sighashType: bitcoin.Transaction.SIGHASH_ALL,
    });
    addWitnessInput(psbt, {
      hash: FOREIGN_TXID,
      script: ownPayment.output!,
      value: 10_000,
      sighashType: bitcoin.Transaction.SIGHASH_NONE,
    });
    psbt.addOutput({ address: foreignPayment.address!, value: 89_000 });

    expect(inspect(psbt)).toEqual([0, 2]);
  });
});
