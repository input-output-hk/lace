/* eslint-disable no-magic-numbers, no-loop-func, @typescript-eslint/no-non-null-assertion, unicorn/consistent-function-scoping, @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires, camelcase */
import { GreedyInputSelector } from '../src/wallet/lib/input-selection/GreedyInputSelector';
import { DUST_THRESHOLD } from '../src/wallet/lib/common';

describe('GreedyInputSelector', () => {
  const selector = new GreedyInputSelector();
  const feeRate = 1; // sat/byte
  const changeAddress = 'change-address';

  const createUTxO = (satoshis: bigint, id = Math.random().toString()) => ({
    txId: id,
    index: 0,
    address: 'address1',
    vout: 0,
    satoshis
  });

  it('selects sufficient UTxOs and returns change', () => {
    const utxos = [createUTxO(BigInt(5000)), createUTxO(BigInt(8000))];
    const outputs = [{ address: 'address1', value: BigInt(4000) }];
    const result = selector.selectInputs(changeAddress, utxos, outputs, feeRate);

    expect(result).toBeDefined();
    expect(result!.selectedUTxOs.length).toBeGreaterThan(0);
    expect(result!.outputs.some((o) => o.address === changeAddress)).toBe(true);
    expect(result!.fee).toBeGreaterThan(0);
  });

  it('returns undefined if inputs are insufficient', () => {
    const utxos = [createUTxO(BigInt(1000))];
    const outputs = [{ address: 'address1', value: BigInt(2000) }];
    const result = selector.selectInputs(changeAddress, utxos, outputs, feeRate);

    expect(result).toBeUndefined();
  });

  it('includes all outputs and correct change when no dust', () => {
    const utxos = [createUTxO(BigInt(10_000))];
    const outputs = [
      { address: 'address1', value: BigInt(3000) },
      { address: 'address2', value: BigInt(2000) }
    ];
    const result = selector.selectInputs(changeAddress, utxos, outputs, feeRate);

    expect(result).toBeDefined();
    const sumOutputs = result!.outputs.reduce((acc, o) => acc + o.value, 0);
    const sumInputs = result!.selectedUTxOs.reduce((acc, u) => acc + Number(u.satoshis), 0);
    expect(sumInputs - sumOutputs - result!.fee).toBe(0);
  });

  it('adds dust change to fee instead of outputting it', () => {
    const utxos = [createUTxO(BigInt(6000))];
    const outputs = [{ address: 'address1', value: BigInt(5500) }];
    const result = selector.selectInputs(changeAddress, utxos, outputs, feeRate);

    expect(result).toBeDefined();
    expect(result!.outputs.some((o) => o.address === changeAddress)).toBe(false);
    const sumOutputs = result!.outputs.reduce((acc, o) => acc + o.value, 0);
    const sumInputs = result!.selectedUTxOs.reduce((acc, u) => acc + Number(u.satoshis), 0);
    expect(sumInputs - sumOutputs - result!.fee).toBe(0);
  });

  it('rescues dust by including an extra UTxO when it is economical', () => {
    const utxos = [createUTxO(BigInt(6000), 'utxo1'), createUTxO(BigInt(1000), 'utxo2')];
    const outputs = [{ address: 'dest1', value: BigInt(5500) }];

    const result = selector.selectInputs(changeAddress, utxos, outputs, feeRate);

    expect(result).toBeDefined();
    // Should include both inputs because rescuing dust is profitable.
    expect(result!.selectedUTxOs.map((u) => u.txId)).toEqual(['utxo1', 'utxo2']);

    // Change output must be present and above the dust threshold.
    const changeOutput = result!.outputs.find((o) => o.address === changeAddress);
    expect(changeOutput).toBeDefined();
    expect(changeOutput!.value).toBeGreaterThanOrEqual(DUST_THRESHOLD);
  });

  it('does NOT rescue dust when the extra input would cost more than the value rescued', () => {
    const bigFeeRate = 5;
    // Single UTxO leaves ~290 sats dust (below dust threshold).
    // Adding the second UTxO would cost ~340 sats in extra fee (68vB * 5) but
    // only rescue ~260 sats, so it should NOT be added.
    const utxos = [createUTxO(BigInt(9000), 'big_utxo'), createUTxO(BigInt(600), 'small_utxo')];
    const outputs = [{ address: 'dest1', value: BigInt(8000) }];

    const result = selector.selectInputs(changeAddress, utxos, outputs, bigFeeRate);

    expect(result).toBeDefined();
    // Only the first (large) UTxO should be used.
    expect(result!.selectedUTxOs.length).toBe(1);
    expect(result!.selectedUTxOs[0].txId).toBe('big_utxo');

    // No change output; dust was added to the fee.
    expect(result!.outputs.some((o) => o.address === changeAddress)).toBe(false);
  });
});
