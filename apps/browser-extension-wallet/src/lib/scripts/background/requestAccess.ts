import pDebounce from 'p-debounce';
import { RequestAccess } from '@cardano-sdk/dapp-connector';
import { storage as webStorage, tabs, Runtime } from 'webextension-polyfill';
import { AuthorizedDappStorage } from '@src/types';

import { authorizedDappsList, userPromptService } from './services/dappService';
import { ensureUiIsOpenAndLoaded, getDappInfoFromLastActiveTab } from './util';
import { authenticator } from './authenticator';
import { AUTHORIZED_DAPPS_KEY } from '../types';
import { Wallet } from '@lace/cardano';
import { BehaviorSubject } from 'rxjs';

const DEBOUNCE_THROTTLE = 500;

export const dappInfo$ = new BehaviorSubject<Wallet.DappInfo>(undefined);

export const requestAccess: RequestAccess = async (sender: Runtime.MessageSender) => {
  const { logo, name } = await getDappInfoFromLastActiveTab(sender);
  dappInfo$.next({ logo, name, url: origin });
  await ensureUiIsOpenAndLoaded('#/dapp/connect', false);
  const isAllowed = await userPromptService.allowOrigin(origin);
  if (isAllowed === 'deny') return Promise.reject();
  if (isAllowed === 'allow') {
    const { authorizedDapps }: AuthorizedDappStorage = await webStorage.local.get(AUTHORIZED_DAPPS_KEY);
    if (authorizedDapps) {
      await webStorage.local.set({ authorizedDapps: [...authorizedDapps, { logo, name, url: origin }] });
      authorizedDappsList.next([...authorizedDapps, { logo, name, url: origin }]);
    } else {
      await webStorage.local.set({ authorizedDapps: [{ logo, name, url: origin }] });
      authorizedDappsList.next([{ logo, name, url: origin }]);
    }
  } else {
    tabs.onRemoved.addListener((t) => {
      if (t === sender.tab.id) {
        authenticator.revokeAccess(sender);
        tabs.onRemoved.removeListener(this);
      }
    });
  }
  return Promise.resolve(true);
};

export const requestAccessDebounced = pDebounce(requestAccess, DEBOUNCE_THROTTLE);
