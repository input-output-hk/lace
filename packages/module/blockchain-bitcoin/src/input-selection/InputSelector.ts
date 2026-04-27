import type { BitcoinUTxO } from '@lace-contract/bitcoin-context';

/**
 * Type definition for the properties required by the InputSelector.
 *
 * @property changeAddress - The address to which any change should be sent.
 * @property utxos - An array of available unspent transaction outputs (UTXOs).
 * @property outputs - An array of desired outputs, each containing an address and value.
 * @property feeRate - The fee rate in satoshis per byte to be used for the transaction.
 * @property hasOpReturn - A boolean indicating if the transaction includes an OP_RETURN output.
 */
export type InputSelectorProps = {
  changeAddress: string;
  utxos: BitcoinUTxO[];
  outputs: { address: string; value: number }[];
  feeRate: number;
  hasOpReturn: boolean;
};

/**
 * Type definition for the result of input selection.
 */
export type InputSelectionResult = {
  selectedUTxOs: BitcoinUTxO[];
  outputs: { address: string; value: number }[];
  fee: number;
};

/**
 * Interface for input selection.
 */
export interface InputSelector {
  /**
   * Select inputs from the available UTXOs for the desired outputs.
   *
   * @param props - The properties required for input selection, including the change address, available UTXOs,
   *                desired outputs, fee rate, and whether the transaction has an OP_RETURN output.
   * @returns An object containing the selected UTXOs, the outputs as returned by coinselect (which might include a change output),
   *          and the calculated fee. Returns null if no valid selection was found.
   */
  selectInputs(props: InputSelectorProps): InputSelectionResult | null;
}
