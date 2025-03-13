import { UTxO } from '../providers';
import { INPUT_SIZE, OUTPUT_SIZE, TRANSACTION_OVERHEAD, DUST_THRESHOLD } from '../common';
import { InputSelector } from './InputSelector';

/**
 * A concrete implementation of InputSelector that uses a simple greedy algorithm.
 */
export class GreedyInputSelector implements InputSelector {
  selectInputs(
    changeAddress: string,
    utxos: UTxO[],
    outputs: { address: string; value: bigint }[],
    feeRate: number
  ): { selectedUTxOs: UTxO[]; outputs: { address: string; value: number }[]; fee: number } | undefined {
    let selectedUTxOs: UTxO[] = [];
    let inputSum: bigint = BigInt(0);
    let fee: number = 0;

    const totalOutput: bigint = outputs.reduce((acc, out) => acc + out.value, BigInt(0));

    for (const utxo of utxos) {
      selectedUTxOs.push(utxo);
      inputSum += utxo.satoshis;

      const estimatedSize =
        selectedUTxOs.length * INPUT_SIZE +
        (outputs.length + 1) * OUTPUT_SIZE +
        TRANSACTION_OVERHEAD;
      fee = Math.ceil(estimatedSize * feeRate);

      if (inputSum >= totalOutput + BigInt(fee)) {
        break;
      }
    }

    if (inputSum < totalOutput + BigInt(fee)) {
      return undefined;
    }

    const change = inputSum - totalOutput - BigInt(fee);

    let coinselectOutputs: { address: string; value: number }[] = outputs.map(o => ({
      address: o.address,
      value: Number(o.value)
    }));

    if (change > BigInt(0)) {
      if (Number(change) < DUST_THRESHOLD) {
        fee += Number(change);
      } else {
        coinselectOutputs.push({ address: changeAddress, value: Number(change) });
      }
    }

    return { selectedUTxOs, outputs: coinselectOutputs, fee };
  }
}
