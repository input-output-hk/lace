import pDebounce from 'p-debounce';
import { Origin, RequestAccess } from '@cardano-sdk/dapp-connector';
import { storage as webStorage, tabs } from 'webextension-polyfill';
import { AuthorizedDappStorage } from '@src/types';

import { authorizedDappsList, userPromptService } from './services/dappService';
import { ensureUiIsOpenAndLoaded, getDappInfoFromLastActiveTab, getLastActiveTab } from './util';
import { authenticator } from './authenticator';
import { AUTHORIZED_DAPPS_KEY } from '../types';
import { Wallet } from '@lace/cardano';
import { BehaviorSubject } from 'rxjs';

const DEBOUNCE_THROTTLE = 500;

export const dappInfo$ = new BehaviorSubject<Wallet.DappInfo>(undefined);

export const requestAccess: RequestAccess = async (origin: Origin) => {
  const launchingTab = await getLastActiveTab();
  const { logo, name, url } = await getDappInfoFromLastActiveTab();
  dappInfo$.next({ logo, name, url });
  await ensureUiIsOpenAndLoaded('#/dapp/connect');
  const isAllowed = await userPromptService.allowOrigin(origin);
  if (isAllowed === 'deny') return Promise.reject();
  if (isAllowed === 'allow') {
    const { authorizedDapps }: AuthorizedDappStorage = await webStorage.local.get(AUTHORIZED_DAPPS_KEY);
    if (authorizedDapps) {
      await webStorage.local.set({ authorizedDapps: [...authorizedDapps, { logo, name, url }] });
      authorizedDappsList.next([...authorizedDapps, { logo, name, url }]);
    } else {
      await webStorage.local.set({ authorizedDapps: [{ logo, name, url }] });
      authorizedDappsList.next([{ logo, name, url }]);
    }
  } else {
    tabs.onRemoved.addListener((t) => {
      if (t === launchingTab.id) {
        authenticator.revokeAccess(origin);
        tabs.onRemoved.removeListener(this);
      }
    });
  }
  return Promise.resolve(true);
};

export const requestAccessDebounced = pDebounce(requestAccess, DEBOUNCE_THROTTLE);
