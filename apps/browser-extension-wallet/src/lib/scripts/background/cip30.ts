import { cip30 as walletCip30 } from '@cardano-sdk/wallet';
import { ensureUiIsOpenAndLoaded } from './util';
import { userPromptService } from './services/dappService';
import { authenticator } from './authenticator';
import { dAppConnectorActivity$, wallet$ } from './wallet';
import { runtime, Tabs, tabs } from 'webextension-polyfill';
import { cip30, exposeApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { DAPP_CHANNELS } from '../../../utils/constants';
import { DappDataService } from '../types';
import { map, Observable, of } from 'rxjs';
import { ApiError, APIErrorCode } from '@cardano-sdk/dapp-connector';
import pDebounce from 'p-debounce';
import { dappInfo$ } from './requestAccess';
import { notifyOnHaveAccessCall } from './session';
import { logger } from '@lace/common';

const DEBOUNCE_THROTTLE = 500;

const cancelOnTabClose = (tab: Tabs.Tab) => ({
  cancel$: new Observable<void>((subscriber) => {
    const listener = (tabId: number) => {
      if (tabId === tab.id) {
        subscriber.next();
        subscriber.complete();
      }
    };
    tabs.onRemoved.addListener(listener);
    return () => {
      tabs.onRemoved.removeListener(listener);
    };
  })
});

export const confirmationCallback: walletCip30.CallbackConfirmation = {
  submitTx: async () =>
    // We don't need another callback for this callback, so long as we ensure callbacks for signing tx's
    // Remove this method once it is dropped from the SDK in future build
    // Also transactions can be submitted by the dApps externally
    // once they've got the witnesss keys if they construct their own transactions
    Promise.resolve(true),
  signTx: pDebounce(
    async () => {
      try {
        const tab = await ensureUiIsOpenAndLoaded('#/dapp/sign-tx');
        const ready = await userPromptService.readyToSignTx();
        if (!ready) return false;
        return cancelOnTabClose(tab);
      } catch (error) {
        logger.error(error);
        throw new ApiError(APIErrorCode.InternalError, 'Unable to sign transaction');
      }
    },
    DEBOUNCE_THROTTLE,
    { before: true }
  ),
  signData: pDebounce(
    async () => {
      try {
        const tab = await ensureUiIsOpenAndLoaded('#/dapp/sign-data');
        const ready = await userPromptService.readyToSignData();
        if (!ready) return false;
        return cancelOnTabClose(tab);
      } catch (error) {
        logger.error(error);
        throw new ApiError(APIErrorCode.InternalError, 'Unable to sign data');
      }
    },
    DEBOUNCE_THROTTLE,
    { before: true }
  )
};

const walletApi = walletCip30.createWalletApi(
  wallet$.pipe(map((activeWallet) => activeWallet?.observableWallet || undefined)),
  confirmationCallback,
  { logger }
);

cip30.initializeBackgroundScript(
  { walletName: process.env.WALLET_NAME },
  {
    authenticator: notifyOnHaveAccessCall(authenticator, dAppConnectorActivity$.next.bind(dAppConnectorActivity$)),
    logger,
    runtime,
    walletApi
  }
);

exposeApi<DappDataService>(
  {
    baseChannel: DAPP_CHANNELS.dappData,
    properties: {
      getDappInfo: RemoteApiPropertyType.MethodReturningPromise
    },
    api$: of({
      getDappInfo: () => Promise.resolve(dappInfo$.value)
    })
  },
  { logger, runtime }
);
