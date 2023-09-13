import { Origin } from '@cardano-sdk/dapp-connector';
import { consumeRemoteApi, exposeApi, RemoteApiProperties, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { AuthorizedDappService, AuthorizedDappStorage } from '@src/types/dappConnector';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { Subject, of } from 'rxjs';
import { runtime, storage as webStorage } from 'webextension-polyfill';
import { authenticator } from '../authenticator';
import { Wallet } from '@lace/cardano';
import { AUTHORIZED_DAPPS_KEY } from '@lib/scripts/types';

const getAuthorizedDappListFromStorage = async () => {
  const { authorizedDapps }: AuthorizedDappStorage = await webStorage.local.get(AUTHORIZED_DAPPS_KEY);
  return authorizedDapps;
};

export const authorizedDappsList = new Subject<Wallet.DappInfo[]>();

const authorizedDappsApi: AuthorizedDappService = {
  authorizedDappsList,
  removeAuthorizedDapp: async (origin: Origin): Promise<boolean> => {
    const originUrl = new URL(origin).origin;
    console.debug(`revoking access for ${originUrl}`);
    const accessRevoked = await authenticator.revokeAccess(originUrl);
    if (accessRevoked) {
      const { authorizedDapps }: AuthorizedDappStorage = await webStorage.local.get(AUTHORIZED_DAPPS_KEY);
      const updated = authorizedDapps.filter((d) => new URL(d.url).origin !== originUrl);
      authorizedDappsList.next(updated);
      webStorage.local.set({ authorizedDapps: updated });
    }
    return accessRevoked;
  }
};

export const dappServiceProperties: RemoteApiProperties<AuthorizedDappService> = {
  authorizedDappsList: RemoteApiPropertyType.HotObservable,
  removeAuthorizedDapp: RemoteApiPropertyType.MethodReturningPromise
};

exposeApi<AuthorizedDappService>(
  {
    api$: of(authorizedDappsApi),
    baseChannel: DAPP_CHANNELS.authorizedDapps,
    properties: dappServiceProperties
  },
  { logger: console, runtime }
);

export interface UserPromptService {
  allowOrigin(origin: Origin): Promise<'allow' | 'just-once' | 'deny'>;
  allowSignData(): Promise<boolean>;
  allowSignTx(): Promise<boolean>;
  getCollateralRequest(): Promise<Wallet.Cardano.Utxo[]>;
}

export const userPromptService = consumeRemoteApi<UserPromptService>(
  {
    baseChannel: DAPP_CHANNELS.userPrompt,
    properties: {
      allowOrigin: RemoteApiPropertyType.MethodReturningPromise,
      allowSignData: RemoteApiPropertyType.MethodReturningPromise,
      allowSignTx: RemoteApiPropertyType.MethodReturningPromise,
      getCollateralRequest: RemoteApiPropertyType.MethodReturningPromise
    }
  },
  { logger: console, runtime }
);

try {
  getAuthorizedDappListFromStorage()
    .then((dapps) => {
      authorizedDappsList.next(dapps);
    })
    .catch((error) => {
      throw new Error(error);
    });
} catch (error) {
  console.log(error);
}
