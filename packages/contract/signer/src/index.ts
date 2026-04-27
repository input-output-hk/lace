import './augmentations';

export { CompositeSignerFactory } from './composite-signer-factory';
export { signerAuthFromPrompt } from './signer-auth';
export { AuthenticationCancelledError } from './types';
export type {
  DataSigner,
  SignerAuth,
  SignerContext,
  SignerFactory,
  SignTransactionRequest,
  SignTransactionResult,
  TransactionSigner,
} from './types';
export * from './contract';
