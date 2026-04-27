import type { TranslationKey } from '@lace-contract/i18n';
import type { WalletId } from '@lace-contract/wallet-repo';
import type { ByteArray } from '@lace-sdk/util';

export type RequestRecoveryPhraseParams = {
  walletId: WalletId;
  authenticationPromptConfig: {
    cancellable: boolean;
    confirmButtonLabel: TranslationKey;
    message: TranslationKey;
  };
};

export type RecoveryPhraseChannel = {
  requestRecoveryPhrase: (
    params: RequestRecoveryPhraseParams,
  ) => Promise<ByteArray>;
};
export type ExposeRecoveryPhraseChannel = (
  recoveryPhraseChannel: RecoveryPhraseChannel,
) => void;
export type ConsumeRecoveryPhraseChannel = () => RecoveryPhraseChannel;

export type RecoveryPhraseChannelExtension = {
  consumeRecoveryPhraseChannel: ConsumeRecoveryPhraseChannel;
  exposeRecoveryPhraseChannel: ExposeRecoveryPhraseChannel;
};
