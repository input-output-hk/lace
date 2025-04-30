/* eslint-disable no-magic-numbers, no-loop-func, @typescript-eslint/no-non-null-assertion, unicorn/consistent-function-scoping, @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires, camelcase */
import { GreedyInputSelector } from '../src/wallet/lib/input-selection/GreedyInputSelector';

describe('GreedyInputSelector', () => {
  const selector = new GreedyInputSelector();
  const feeRate = 1; // sat/byte
  const changeAddress = 'change-address';

  const createUTXO = (satoshis: bigint, id = Math.random().toString()) => ({
    txId: id,
    index: 0,
    address: 'address1',
    vout: 0,
    satoshis
  });

  it('selects sufficient UTXOs and returns change', () => {
    const utxos = [createUTXO(BigInt(5000)), createUTXO(BigInt(8000))];
    const outputs = [{ address: 'address1', value: BigInt(4000) }];
    const result = selector.selectInputs(changeAddress, utxos, outputs, feeRate);

    expect(result).toBeDefined();
    expect(result!.selectedUTxOs.length).toBeGreaterThan(0);
    expect(result!.outputs.some((o) => o.address === changeAddress)).toBe(true);
    expect(result!.fee).toBeGreaterThan(0);
  });

  it('returns undefined if inputs are insufficient', () => {
    const utxos = [createUTXO(BigInt(1000))];
    const outputs = [{ address: 'address1', value: BigInt(2000) }];
    const result = selector.selectInputs(changeAddress, utxos, outputs, feeRate);

    expect(result).toBeUndefined();
  });

  it('includes all outputs and correct change when no dust', () => {
    const utxos = [createUTXO(BigInt(10_000))];
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
    const utxos = [createUTXO(BigInt(6000))];
    const outputs = [{ address: 'address1', value: BigInt(5500) }];
    const result = selector.selectInputs(changeAddress, utxos, outputs, feeRate);

    expect(result).toBeDefined();
    expect(result!.outputs.some((o) => o.address === changeAddress)).toBe(false);
    const sumOutputs = result!.outputs.reduce((acc, o) => acc + o.value, 0);
    const sumInputs = result!.selectedUTxOs.reduce((acc, u) => acc + Number(u.satoshis), 0);
    expect(sumInputs - sumOutputs - result!.fee).toBe(0);
  });
});
