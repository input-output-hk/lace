import './augmentations';

export * from './contract';
export type * from './store';

export {
  RecoveryPhraseRequestError,
  connectRecoveryPhraseChannel,
} from './mnemonic-channel';
export type { RecoveryPhraseRequestErrorReason } from './mnemonic-channel';
export type {
  ConsumeRecoveryPhraseChannel,
  ExposeRecoveryPhraseChannel,
  RecoveryPhraseChannel,
  RecoveryPhraseChannelExtension,
  RequestRecoveryPhraseParams,
} from './types';
