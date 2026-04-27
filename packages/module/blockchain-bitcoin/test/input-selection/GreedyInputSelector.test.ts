import { it, describe, expect } from 'vitest';

import { DUST_THRESHOLD } from '../../src/common';
import { GreedyInputSelector } from '../../src/input-selection';

import type { BitcoinUTxO } from '@lace-contract/bitcoin-context';

describe('GreedyInputSelector', () => {
  const selector = new GreedyInputSelector();
  const feeRate = 1; // sat/byte
  const changeAddress = 'change-address';

  const createUTxO = (
    satoshis: number,
    id = Math.random().toString(),
  ): BitcoinUTxO => ({
    txId: id,
    index: 0,
    address: 'address1',
    satoshis,
    script: '',
    confirmations: 1,
    height: 0,
    runes: [],
    inscriptions: [],
  });

  it('selects sufficient UTxOs and returns change', () => {
    const utxos = [createUTxO(5000), createUTxO(8000)];
    const outputs = [{ address: 'address1', value: 4000 }];
    const result = selector.selectInputs({
      changeAddress,
      utxos,
      outputs,
      feeRate,
      hasOpReturn: false,
    });

    expect(result).toBeDefined();
    expect(result!.selectedUTxOs.length).toBeGreaterThan(0);
    expect(result!.outputs.some(o => o.address === changeAddress)).toBe(true);
    expect(result!.fee).toBeGreaterThan(0);
  });

  it('returns undefined if inputs are insufficient', () => {
    const utxos = [createUTxO(1000)];
    const outputs = [{ address: 'address1', value: 2000 }];
    const result = selector.selectInputs({
      changeAddress,
      utxos,
      outputs,
      feeRate,
      hasOpReturn: false,
    });

    expect(result).toBeNull();
  });

  it('includes all outputs and correct change when no dust', () => {
    const utxos = [createUTxO(10_000)];
    const outputs = [
      { address: 'address1', value: 3000 },
      { address: 'address2', value: 2000 },
    ];
    const result = selector.selectInputs({
      changeAddress,
      utxos,
      outputs,
      feeRate,
      hasOpReturn: false,
    });

    expect(result).toBeDefined();
    const sumOutputs = result!.outputs.reduce(
      (accumulator, o) => accumulator + o.value,
      0,
    );
    const sumInputs = result!.selectedUTxOs.reduce(
      (accumulator, u) => accumulator + Number(u.satoshis),
      0,
    );
    expect(sumInputs - sumOutputs - result!.fee).toBe(0);
  });

  it('adds dust change to fee instead of outputting it', () => {
    const utxos = [createUTxO(6000)];
    const outputs = [{ address: 'address1', value: 5500 }];
    const result = selector.selectInputs({
      changeAddress,
      utxos,
      outputs,
      feeRate,
      hasOpReturn: false,
    });

    expect(result).toBeDefined();
    expect(result!.outputs.some(o => o.address === changeAddress)).toBe(false);
    const sumOutputs = result!.outputs.reduce(
      (accumulator, o) => accumulator + o.value,
      0,
    );
    const sumInputs = result!.selectedUTxOs.reduce(
      (accumulator, u) => accumulator + Number(u.satoshis),
      0,
    );
    expect(sumInputs - sumOutputs - result!.fee).toBe(0);
  });

  it('rescues dust by including an extra UTxO when it is economical', () => {
    const utxos = [createUTxO(6000, 'utxo1'), createUTxO(1000, 'utxo2')];
    const outputs = [{ address: 'dest1', value: 5500 }];

    const result = selector.selectInputs({
      changeAddress,
      utxos,
      outputs,
      feeRate,
      hasOpReturn: false,
    });

    expect(result).toBeDefined();
    // Should include both inputs because rescuing dust is profitable.
    expect(result!.selectedUTxOs.map(u => u.txId)).toEqual(['utxo1', 'utxo2']);

    // Change output must be present and above the dust threshold.
    const changeOutput = result!.outputs.find(o => o.address === changeAddress);
    expect(changeOutput).toBeDefined();
    expect(changeOutput!.value).toBeGreaterThanOrEqual(DUST_THRESHOLD);
  });

  it('does NOT rescue dust when rescued amount is economical but new change stays below dust threshold', () => {
    // 'a' alone leaves 91 sats change (below dust=546).
    // 'b' adds 400 sats: rescued=301 > extraCost=68 (economical), but newChange=392 < 546.
    // Rescue is skipped; dust is folded into fee.
    const utxos = [createUTxO(5200, 'a'), createUTxO(400, 'b')];
    const outputs = [{ address: 'dest1', value: 5000 }];
    const result = selector.selectInputs({
      changeAddress,
      utxos,
      outputs,
      feeRate,
      hasOpReturn: false,
    });

    expect(result).toBeDefined();
    expect(result!.selectedUTxOs.length).toBe(1);
    expect(result!.selectedUTxOs[0].txId).toBe('a');
    expect(result!.outputs.some(o => o.address === changeAddress)).toBe(false);
    const sumOutputs = result!.outputs.reduce(
      (accumulator, o) => accumulator + o.value,
      0,
    );
    const sumInputs = result!.selectedUTxOs.reduce(
      (accumulator, u) => accumulator + u.satoshis,
      0,
    );
    expect(sumInputs - sumOutputs - result!.fee).toBe(0);
  });

  it('does not double-count OP_RETURN output when computing fee', () => {
    // With feeRate=1, INPUT_SIZE=68, OUTPUT_SIZE=31, OVERHEAD=10:
    // 1 input + 1 regular output + 1 OP_RETURN = 68 + 31*2 + 10 = 140 vbytes -> fee=140
    // Bug would produce: 1 input + 2 outputs (caller +1) + 1 OP_RETURN (computeFee +1) = 68 + 31*3 + 10 = 171 -> fee=171
    const utxos = [createUTxO(10_000)];
    const outputs = [{ address: 'dest1', value: 3000 }];
    const result = selector.selectInputs({
      changeAddress,
      utxos,
      outputs,
      feeRate,
      hasOpReturn: true,
    });

    expect(result).toBeDefined();
    expect(result!.fee).toBe(140);
    const sumOutputs = result!.outputs.reduce(
      (accumulator, o) => accumulator + o.value,
      0,
    );
    const sumInputs = result!.selectedUTxOs.reduce(
      (accumulator, u) => accumulator + u.satoshis,
      0,
    );
    expect(sumInputs - sumOutputs - result!.fee).toBe(0);
  });

  it('does NOT rescue dust when the extra input would cost more than the value rescued', () => {
    const bigFeeRate = 5;
    // Single UTxO leaves ~290 sats dust (below dust threshold).
    // Adding the second UTxO would cost ~340 sats in extra fee (68vB * 5) but
    // only rescue ~260 sats, so it should NOT be added.
    const utxos = [createUTxO(9000, 'big_utxo'), createUTxO(600, 'small_utxo')];
    const outputs = [{ address: 'dest1', value: 8000 }];

    const result = selector.selectInputs({
      changeAddress,
      utxos,
      outputs,
      feeRate: bigFeeRate,
      hasOpReturn: false,
    });

    expect(result).toBeDefined();
    // Only the first (large) UTxO should be used.
    expect(result!.selectedUTxOs.length).toBe(1);
    expect(result!.selectedUTxOs[0].txId).toBe('big_utxo');

    // No change output; dust was added to the fee.
    expect(result!.outputs.some(o => o.address === changeAddress)).toBe(false);
  });
});
