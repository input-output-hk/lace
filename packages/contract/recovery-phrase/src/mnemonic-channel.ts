import { createObservableHook } from '@lace-lib/util-store';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

import type {
  ConsumeRecoveryPhraseChannel,
  ExposeRecoveryPhraseChannel,
  RecoveryPhraseChannel,
} from './types';
import type { ByteArray, MakePropertiesObservable } from '@lace-sdk/util';

export type OnMnemonicRequest = ReturnType<
  typeof initialiseRecoveryPhraseChannel
>['onRequest'];

export type RecoveryPhraseRequestErrorReason =
  | 'cancelled'
  | 'failed'
  | 'not-available';

export class RecoveryPhraseRequestError extends Error {
  public __RecoveryPhraseRequestError = '__RecoveryPhraseRequestError';
  public reason: RecoveryPhraseRequestErrorReason;
  public constructor(reason: RecoveryPhraseRequestErrorReason) {
    super(`Failed to obtain recovery phrase. Reason: ${reason}`);
    this.reason = reason;
  }

  public static isRecoveryPhraseRequestError = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: any,
  ): error is RecoveryPhraseRequestError =>
    !!error &&
    '__RecoveryPhraseRequestError' in error &&
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    error.__RecoveryPhraseRequestError === '__RecoveryPhraseRequestError';
}

const mnemonicChannel$ = new BehaviorSubject<RecoveryPhraseChannel | null>(
  null,
);
const defaultExposeChannel: ExposeRecoveryPhraseChannel = mnemonicChannel => {
  mnemonicChannel$.next(mnemonicChannel);
};
const defaultConsumeChannel: ConsumeRecoveryPhraseChannel = () => {
  if (!mnemonicChannel$.value) {
    throw new Error('Recovery Phrase Channel not available');
  }
  return mnemonicChannel$.value;
};

const setMnemonicCleanup = (
  mnemonic: ByteArray,
  { shortTimeout }: { shortTimeout?: boolean } = {},
) => {
  setTimeout(
    () => {
      mnemonic.fill(0);
    },
    shortTimeout ? 1000 : 10_000,
  );
};

type InitialiseMnemonicChannelParams = {
  exposeChannel?: ExposeRecoveryPhraseChannel;
};

export const initialiseRecoveryPhraseChannel = ({
  exposeChannel = defaultExposeChannel,
}: InitialiseMnemonicChannelParams) => {
  const { trigger, onRequest } =
    createObservableHook<
      MakePropertiesObservable<RecoveryPhraseChannel>['requestRecoveryPhrase']
    >();

  exposeChannel({
    requestRecoveryPhrase: async params => {
      let mnemonic: ByteArray;
      try {
        mnemonic = await firstValueFrom(trigger(params));
      } catch (error) {
        if (error instanceof RecoveryPhraseRequestError) {
          throw error;
        }
        throw new RecoveryPhraseRequestError('failed');
      }

      const isSameProcessCommunication = exposeChannel === defaultExposeChannel;
      // - In the web extension env mnemonic gets sent to a separate process
      //   and after that it is not touched anymore so the cleanup timeout could
      //   be fairly small to only account for the sending to complete.
      // - In the mobile env the communication happens in the same process,
      //   so the receiver operates on the same mnemonic instance. Therefore,
      //   the timeout is bigger to avoid to early cleanup before the mnemonic
      //   processing completes. Anyway, the caller cleans it right after
      //   processing it, so in this case cleanup here serves as an additional
      //   layer of security.
      setMnemonicCleanup(mnemonic, {
        shortTimeout: !isSameProcessCommunication,
      });
      return mnemonic;
    },
  });

  return {
    onRequest,
  };
};

type ConnectMnemonicChannelParams = {
  consumeChannel?: ConsumeRecoveryPhraseChannel;
};

export const connectRecoveryPhraseChannel = ({
  consumeChannel = defaultConsumeChannel,
}: ConnectMnemonicChannelParams): RecoveryPhraseChannel => {
  const recoveryPhraseChannel = consumeChannel();
  return {
    requestRecoveryPhrase: async params => {
      const mnemonic = await recoveryPhraseChannel.requestRecoveryPhrase(
        params,
      );
      // the caller cleans it right after processing it, so this cleanup serves
      // as an additional layer of security.
      setMnemonicCleanup(mnemonic);
      return mnemonic;
    },
  };
};
