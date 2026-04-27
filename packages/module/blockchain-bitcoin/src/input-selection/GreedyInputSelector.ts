import {
  INPUT_SIZE,
  OUTPUT_SIZE,
  TRANSACTION_OVERHEAD,
  DUST_THRESHOLD,
} from '../common';

import type {
  InputSelectionResult,
  InputSelector,
  InputSelectorProps,
} from './InputSelector';
import type { BitcoinUTxO } from '@lace-contract/bitcoin-context';

type RescueDustParams = {
  change: number;
  feeRate: number;
  selected: BitcoinUTxO[];
  remaining: BitcoinUTxO[];
  inputSum: number;
  totalOutput: number;
  outputsCount: number;
  hasOpReturn: boolean;
};

type ComputeFeeParams = {
  inputCount: number;
  outputCount: number;
  feeRate: number;
  hasOpReturn: boolean;
};

/**
 * A concrete implementation of InputSelector that uses a simple greedy algorithm.
 */
export class GreedyInputSelector implements InputSelector {
  public selectInputs(props: InputSelectorProps): InputSelectionResult | null {
    const { changeAddress, utxos, outputs, feeRate, hasOpReturn } = props;

    const selected: BitcoinUTxO[] = [];
    const totalOutput = outputs.reduce(
      (accumulator, output) => accumulator + output.value,
      0,
    );
    let inputSum = 0;
    let fee = 0;

    for (const utxo of utxos) {
      selected.push(utxo);
      inputSum += utxo.satoshis;
      fee = this.computeFee({
        inputCount: selected.length,
        outputCount: outputs.length,
        feeRate,
        hasOpReturn,
      });

      if (inputSum >= totalOutput + fee) break;
    }

    if (inputSum < totalOutput + fee) return null;

    let change = inputSum - totalOutput - fee;

    if (change > 0 && change < DUST_THRESHOLD) {
      const { change: newChange, fee: feeDelta } = this.attemptDustRescue({
        change,
        feeRate,
        selected,
        remaining: utxos.slice(selected.length),
        inputSum,
        totalOutput,
        outputsCount: outputs.length,
        hasOpReturn,
      });
      change = newChange;
      fee += feeDelta;

      if (change < DUST_THRESHOLD) {
        fee += change;
        change = 0;
      }
    }

    const finalOutputs = outputs.map(({ address, value }) => ({
      address,
      value,
    }));

    if (change >= DUST_THRESHOLD) {
      finalOutputs.push({ address: changeAddress, value: change });
    }

    return { selectedUTxOs: selected, outputs: finalOutputs, fee };
  }

  /** Estimate the fee for a given input / output count */
  private computeFee(params: ComputeFeeParams): number {
    const { inputCount, outputCount, feeRate, hasOpReturn } = params;
    const size =
      inputCount * INPUT_SIZE +
      (outputCount + (hasOpReturn ? 1 : 0)) * OUTPUT_SIZE +
      TRANSACTION_OVERHEAD;
    return Math.ceil(size * feeRate);
  }

  /**
   * Try to pull one more UTxO so that change exceeds the dust threshold if
   * the value rescued is worth more than the added fee.
   */
  private attemptDustRescue({
    change,
    feeRate,
    selected,
    remaining,
    inputSum,
    totalOutput,
    outputsCount,
    hasOpReturn,
  }: RescueDustParams): { change: number; fee: number } {
    if (change === 0 || change >= DUST_THRESHOLD) return { change, fee: 0 };

    const originalChange = change;
    let feeDelta = 0;

    for (const utxo of remaining) {
      const newInputSum = inputSum + utxo.satoshis;
      const newFee = this.computeFee({
        inputCount: selected.length + 1,
        outputCount: outputsCount + 1,
        feeRate,
        hasOpReturn,
      });

      const newChange = newInputSum - totalOutput - newFee;

      const rescued = newChange - originalChange;
      const extraCost = Math.ceil(INPUT_SIZE * feeRate);

      if (rescued >= extraCost && newChange >= DUST_THRESHOLD) {
        selected.push(utxo);
        feeDelta =
          newFee -
          this.computeFee({
            inputCount: selected.length - 1,
            outputCount: outputsCount + 1,
            feeRate,
            hasOpReturn,
          });

        return { change: newChange, fee: feeDelta };
      }
    }

    return { change, fee: 0 };
  }
}
