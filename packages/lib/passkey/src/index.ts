export {
  HKDF_RECORD_KEY_INFO,
  HKDF_WALLET_ENTROPY_INFO,
  PRF_SALT_AUTHORISER_LABEL,
  PRF_SALT_ROOT_LABEL,
} from './constants';
export { createPasskeyKeySource } from './key-source';
export {
  PasskeyCeremonyCancelledError,
  PasskeyCredentialMismatchError,
  PasskeyPrfUnsupportedError,
  RemoteSignerError,
  SignerClosedError,
  SignerPopupBlockedError,
} from './errors';
export { createSignerClient } from './remote/client';
export type {
  CreatePasskeyKeySourceProps,
  PasskeyCredentialRef,
  PasskeyKeySource,
} from './key-source';
export type { CreateSignerClientProps, SignerClient } from './remote/client';
export type {
  SignerRequest,
  SignerRequestKind,
  SignerRequestPayloads,
} from './remote/protocol';
export * from './extension-exports';
