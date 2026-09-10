export {
  bitcoinDappConnectorReducers,
  bitcoinDappConnectorActions,
  bitcoinDappConnectorSelectors,
  type DappInfo,
  type PendingSignMessageRequest,
  type PendingSignPsbtRequest,
  type ResolvedInputsStatus,
  type ResolvedPreviousOut,
  type ResolvedInputs,
  type BitcoinDappConnectorState,
} from './slice';
export {
  BitcoinDappConnectorApi,
  type BitcoinAccountUtxoMap,
  type BitcoinDappConnectorApiDependencies,
  type BitcoinDappConnectorProvider,
  type BuildSendTxFunction,
  type ConfirmSendTxFunction,
  type SubmitRawTxFunction,
  type SignBitcoinMessageFunction,
  type SignBitcoinPsbtFunction,
} from './dependencies/bitcoin-dapp-connector-api';
export { initializeBitcoinDappConnectorSideEffectDependencies } from './dependencies/dapp-connector';
export {
  createBitcoinConfirmationCallback,
  type BitcoinRequestType,
  type SignMessageRequestData,
  type SignPsbtRequestData,
  type BitcoinRequestData,
  type BitcoinConfirmationResult,
  type BitcoinConfirmationRequest,
  type BitcoinConfirmationCallbackResult,
  type BitcoinConfirmationCallback,
} from './dependencies/create-confirmation-callback';
export {
  closeRequestedPopup,
  connectBitcoinDappConnectorApi,
  initializeLaceExtensionSideEffects,
  resolveForeignPsbtInputs,
} from './side-effects';
export { promptBitcoinAuthorizeDapp } from './authorize-dapp-util';
export {
  detectViewClosure,
  findTargetSidePanel,
  signMessage$,
  signPsbt$,
  type BitcoinSigningResult,
  type SignMessageParams,
  type SignPsbtParams,
} from './util';
