import pDebounce from 'p-debounce';
import { RequestAccess } from '@cardano-sdk/dapp-connector';
import { storage as webStorage, tabs, Runtime } from 'webextension-polyfill';
import { AuthorizedDappStorage } from '@src/types';

import { authorizedDappsList, userPromptService } from './services/dappService';
import { ensureUiIsOpenAndLoaded, getDappInfoFromLastActiveTab, getLastActiveTab } from './util';
import { authenticator } from './authenticator';
import { AUTHORIZED_DAPPS_KEY } from '../types';
import { Wallet } from '@lace/cardano';
import { BehaviorSubject } from 'rxjs';

const DEBOUNCE_THROTTLE = 500;

export const dappInfo$ = new BehaviorSubject<Wallet.DappInfo>(undefined);

export const requestAccess: RequestAccess = async (sender: Runtime.MessageSender) => {
  const launchingTab = await getLastActiveTab(sender.url);
  const { logo, name, url } = await getDappInfoFromLastActiveTab(sender.url);
  dappInfo$.next({ logo, name, url: new URL(sender.url).origin });
  await ensureUiIsOpenAndLoaded('#/dapp/connect', false);
  const isAllowed = await userPromptService.allowOrigin(sender.url);
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
        authenticator.revokeAccess(sender);
        tabs.onRemoved.removeListener(this);
      }
    });
  }
  return Promise.resolve(true);
};

export const requestAccessDebounced = pDebounce(requestAccess, DEBOUNCE_THROTTLE);
