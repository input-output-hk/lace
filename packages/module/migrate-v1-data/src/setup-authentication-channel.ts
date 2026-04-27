import { createObservableHook } from '@lace-lib/util-store';
import {
  ChannelName,
  consumeRemoteApi,
  exposeApi,
  RemoteApiPropertyType,
} from '@lace-sdk/extension-messaging';
import { finalize, firstValueFrom } from 'rxjs';
import { of } from 'rxjs';
import { runtime } from 'webextension-polyfill';

import type { AuthSecret } from '@lace-contract/authentication-prompt';
import type { RemoteApiProperties } from '@lace-sdk/extension-messaging';
import type { WithLogger, MakePropertiesObservable } from '@lace-sdk/util';

type SetupAuthenticationChannel = {
  setup: (authSecret: AuthSecret) => Promise<boolean>;
};

export type OnSetupAuthentication = ReturnType<
  typeof initialiseSetupAuthenticationChannel
>['onSetupAuthentication'];

const setupAuthenticationHook =
  createObservableHook<
    MakePropertiesObservable<SetupAuthenticationChannel>['setup']
  >();

const setupAuthenticationChannelConfig = {
  baseChannel: ChannelName('setup-authentication-channel'),
  properties: {
    setup: RemoteApiPropertyType.MethodReturningPromise,
  } satisfies RemoteApiProperties<SetupAuthenticationChannel>,
};

export const initialiseSetupAuthenticationChannel = ({
  logger,
}: WithLogger) => {
  exposeApi<SetupAuthenticationChannel>(
    {
      ...setupAuthenticationChannelConfig,
      api$: of({
        setup: async authSecret =>
          firstValueFrom(setupAuthenticationHook.trigger(authSecret)),
      }),
    },
    { logger, runtime },
  );

  const onSetupAuthentication = (
    callback: MakePropertiesObservable<SetupAuthenticationChannel>['setup'],
  ) =>
    setupAuthenticationHook.onRequest(authSecret => {
      return callback(authSecret).pipe(
        finalize(() => {
          authSecret.fill(0);
        }),
      );
    });

  return {
    onSetupAuthentication,
  };
};

export const connectSetupAuthenticationChannel = ({ logger }: WithLogger) =>
  consumeRemoteApi<SetupAuthenticationChannel>(
    setupAuthenticationChannelConfig,
    {
      logger,
      runtime,
    },
  );
