import { sendAuthSecretApi } from '@lace-contract/authentication-prompt';
import {
  ChannelName,
  consumeRemoteApi,
  exposeApi,
  RemoteApiPropertyType,
} from '@lace-sdk/extension-messaging';
import { Platform } from 'react-native';
import { of } from 'rxjs';
import { runtime } from 'webextension-polyfill';

import type { AvailableAddons } from '..';
import type {
  SendAuthSecretApi,
  InternalAuthSecretApiExtension,
  ConsumeInternalAuthSecretApi,
} from '@lace-contract/authentication-prompt';
import type { ContextualLaceInit } from '@lace-contract/module';

const internalAuthSecretApiConfig = {
  baseChannel: ChannelName('internalAuthSecretApi'),
  properties: {
    sendAuthSecretInternally: RemoteApiPropertyType.MethodReturningPromise,
  } satisfies Record<keyof SendAuthSecretApi, RemoteApiPropertyType>,
};

const isBackgroundServiceWorker =
  typeof globalThis === 'object' &&
  globalThis.constructor.name === 'ServiceWorkerGlobalScope';

export const consumeInternalAuthSecretApi: ConsumeInternalAuthSecretApi = ({
  logger,
}) => {
  // TODO: LW-13372 once there is a dedicated module for mobile auth prompt
  //  there is no need for the override bellow
  if (Platform.OS !== 'web' || isBackgroundServiceWorker) {
    return {
      sendAuthSecretInternally: sendAuthSecretApi.sendAuthSecretInternally,
    };
  }

  return consumeRemoteApi<SendAuthSecretApi>(internalAuthSecretApiConfig, {
    logger,
    runtime,
  });
};

const authenticationPromptApiExtension: ContextualLaceInit<
  InternalAuthSecretApiExtension,
  AvailableAddons
> = (_, { logger }) => ({
  consumeInternalAuthSecretApi,
  exposeInternalAuthSecretApi: api => {
    // TODO: LW-13372 remove the check once there is a dedicated module
    //  for mobile auth prompt
    if (Platform.OS !== 'web') return;
    exposeApi(
      {
        ...internalAuthSecretApiConfig,
        api$: of(api),
      },
      { logger, runtime },
    );
  },
});

export default authenticationPromptApiExtension;
