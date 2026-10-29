import type { HandleResolution, Provider } from '../..';
import type { TxCBOR } from '../../Serialization/Transaction';

export interface SubmitTxArgs {
  signedTransaction: TxCBOR;
  context?: { handleResolutions: HandleResolution[] };
}

export interface TxSubmitProvider extends Provider {
  /**
   * @param signedTransaction signed and serialized cbor
   */
  submitTx: (args: SubmitTxArgs) => Promise<void>;
}
