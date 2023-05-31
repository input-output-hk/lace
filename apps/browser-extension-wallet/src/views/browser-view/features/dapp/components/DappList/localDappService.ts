import { consumeRemoteApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { AuthorizedDappService } from '@src/types/dappConnector';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { runtime } from 'webextension-polyfill';

export const localDappService = consumeRemoteApi<Partial<AuthorizedDappService>>(
  {
    baseChannel: DAPP_CHANNELS.authorizedDapps,
    properties: {
      removeAuthorizedDapp: RemoteApiPropertyType.MethodReturningPromise
    }
  },
  { logger: console, runtime }
);
