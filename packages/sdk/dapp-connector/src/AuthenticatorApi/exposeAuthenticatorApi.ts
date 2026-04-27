import {
  RemoteApiPropertyType,
  exposeApi,
} from '@lace-sdk/extension-messaging';
import { of } from 'rxjs';

import { cloneSender } from '../util';

import { RemoteAuthenticatorMethodNames } from './properties';

import type { AuthenticatorApi, RemoteAuthenticator } from './types';
import type {
  MessengerDependencies,
  RemoteApiMethod,
  RemoteApiProperties,
  ChannelName,
} from '@lace-sdk/extension-messaging';

export interface ExposeAuthenticatorApiOptions {
  baseChannel: ChannelName;
}

export interface BackgroundAuthenticatorDependencies
  extends MessengerDependencies {
  authenticator: AuthenticatorApi;
}

// tested in e2e tests
export const exposeAuthenticatorApi = (
  { baseChannel }: ExposeAuthenticatorApiOptions,
  dependencies: BackgroundAuthenticatorDependencies,
) =>
  exposeApi(
    {
      api$: of(dependencies.authenticator),
      baseChannel,
      properties: Object.fromEntries(
        RemoteAuthenticatorMethodNames.map(property => [
          property,
          {
            propType: RemoteApiPropertyType.MethodReturningPromise,
            requestOptions: {
              transform: ({ method, args }, sender) => {
                if (!sender) throw new Error('Unknown sender');
                return {
                  args: [cloneSender(sender), ...args],
                  method,
                };
              },
            },
          } as RemoteApiMethod,
        ]),
      ) as RemoteApiProperties<RemoteAuthenticator>,
    },
    dependencies,
  );
