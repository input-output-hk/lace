import type { BitcoinUTxO } from '@lace-contract/bitcoin-context';

/**
 * Type definition for the properties required by the InputSelector.
 */
export type InputSelectorProps = {
  /** The address to which any change should be sent. */
  changeAddress: string;
  /** An array of available unspent transaction outputs (UTXOs). */
  utxos: BitcoinUTxO[];
  /** An array of desired outputs, each containing an address and value. */
  outputs: { address: string; value: number }[];
  /** The fee rate in satoshis per byte to be used for the transaction. */
  feeRate: number;
  /** A boolean indicating if the transaction includes an OP_RETURN output. */
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
