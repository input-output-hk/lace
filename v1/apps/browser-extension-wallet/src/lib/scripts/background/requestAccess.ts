import pDebounce from 'p-debounce';
import { RequestAccess } from '@cardano-sdk/dapp-connector';
import { storage as webStorage, tabs, Runtime } from 'webextension-polyfill';
import { AuthorizedDappStorage } from '@src/types';

import { authorizedDappsList, userPromptService } from './services/dappService';
import { ensureUiIsOpenAndLoaded } from './util';
import { authenticator } from './authenticator';
import { AUTHORIZED_DAPPS_KEY } from '../types';
import { Wallet } from '@lace/cardano';
import { BehaviorSubject } from 'rxjs';
import { senderToDappInfo } from '@src/utils/senderToDappInfo';
import { logger } from '@lace/common';

const DEBOUNCE_THROTTLE = 500;

export const dappInfo$ = new BehaviorSubject<Wallet.DappInfo>(undefined);

export const requestAccess: RequestAccess = async (sender: Runtime.MessageSender) => {
  let dappInfo: Wallet.DappInfo;
  try {
    dappInfo = await senderToDappInfo(sender);
  } catch (error) {
    logger.error('Failed to get info of a DApp requesting access', error);
    return false;
  }

  const { logo, name, url } = dappInfo;
  dappInfo$.next({ logo, name, url });

  try {
    await ensureUiIsOpenAndLoaded('#/dapp/connect');
  } catch (error) {
    logger.error('Failed to ensure DApp connection UI is loaded', error);
    return false;
  }

  const isAllowed = await userPromptService.allowOrigin(url);
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
    const onRemovedHandler = (tabId: number) => {
      if (tabId === sender.tab.id) {
        authenticator.revokeAccess(sender);
        tabs.onRemoved.removeListener(onRemovedHandler);
      }
    };
    tabs.onRemoved.addListener(onRemovedHandler);
  }

  return true;
};

export const requestAccessDebounced = pDebounce(requestAccess, DEBOUNCE_THROTTLE, { before: true });
