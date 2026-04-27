import {
  ChannelName,
  consumeRemoteApi,
  exposeApi,
  RemoteApiPropertyType,
} from '@lace-sdk/extension-messaging';
import { of } from 'rxjs';
import { runtime } from 'webextension-polyfill';

import type { AvailableAddons } from '../index';
import type { ContextualLaceInit } from '@lace-contract/module';
import type {
  RecoveryPhraseChannel,
  RecoveryPhraseChannelExtension,
} from '@lace-contract/recovery-phrase';
import type { RemoteApiProperties } from '@lace-sdk/extension-messaging';

const mnemonicChannelConfig = {
  baseChannel: ChannelName('recovery-phrase-provision-channel'),
  properties: {
    requestRecoveryPhrase: RemoteApiPropertyType.MethodReturningPromise,
  } satisfies RemoteApiProperties<RecoveryPhraseChannel>,
};

const recoveryPhraseChannelExtension: ContextualLaceInit<
  RecoveryPhraseChannelExtension,
  AvailableAddons
> = (_, { logger }) => ({
  consumeRecoveryPhraseChannel: () =>
    consumeRemoteApi<RecoveryPhraseChannel>(mnemonicChannelConfig, {
      logger,
      runtime,
    }),
  exposeRecoveryPhraseChannel: recoveryPhraseChannel => {
    exposeApi<RecoveryPhraseChannel>(
      {
        ...mnemonicChannelConfig,
        api$: of(recoveryPhraseChannel),
      },
      { logger, runtime },
    );
  },
});

export default recoveryPhraseChannelExtension;
