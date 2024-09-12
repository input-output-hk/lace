import { cip30 as walletCip30 } from '@cardano-sdk/wallet';
import { ensureUiIsOpenAndLoaded } from './util';
import { userPromptService } from './services/dappService';
import { authenticator } from './authenticator';
import { wallet$, walletManager, walletRepository } from './wallet';
import { runtime, Tabs, tabs } from 'webextension-polyfill';
import { exposeApi, RemoteApiPropertyType, cip30 } from '@cardano-sdk/web-extension';
import { DAPP_CHANNELS } from '../../../utils/constants';
import { DappDataService } from '../types';
import { BehaviorSubject, map, Observable, of } from 'rxjs';
import { APIErrorCode, ApiError } from '@cardano-sdk/dapp-connector';
import { Wallet } from '@lace/cardano';
import pDebounce from 'p-debounce';
import { dappInfo$ } from './requestAccess';
import { senderToDappInfo } from '@src/utils/senderToDappInfo';

const DEBOUNCE_THROTTLE = 500;

const dappSetCollateral$ = new BehaviorSubject<{
  dappInfo: Wallet.DappInfo;
  collateralRequest: walletCip30.GetCollateralCallbackParams['data'];
}>(undefined);

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
  signTx: pDebounce(async () => {
    try {
      const tab = await ensureUiIsOpenAndLoaded({ walletManager, walletRepository }, '#/dapp/sign-tx');
      const ready = await userPromptService.readyToSignTx();
      if (!ready) return false;
      return cancelOnTabClose(tab);
    } catch (error) {
      console.error(error);
      return Promise.reject(new ApiError(APIErrorCode.InternalError, 'Unable to sign transaction'));
    }
  }, DEBOUNCE_THROTTLE),
  signData: pDebounce(async () => {
    try {
      const tab = await ensureUiIsOpenAndLoaded({ walletManager, walletRepository }, '#/dapp/sign-data');
      const ready = await userPromptService.readyToSignData();
      if (!ready) return false;
      return cancelOnTabClose(tab);
    } catch (error) {
      console.error(error);
      // eslint-disable-next-line unicorn/no-useless-undefined
      return Promise.reject(new ApiError(APIErrorCode.InternalError, 'Unable to sign data'));
    }
  }, DEBOUNCE_THROTTLE),
  getCollateral: pDebounce(async (args) => {
    try {
      const dappInfo = await senderToDappInfo(args.sender);
      dappSetCollateral$.next({ dappInfo, collateralRequest: args.data });
      await ensureUiIsOpenAndLoaded({ walletManager, walletRepository }, '#/dapp/set-collateral');

      return userPromptService.getCollateralRequest();
    } catch (error) {
      // eslint-disable-next-line unicorn/no-useless-undefined
      dappSetCollateral$.next(undefined);
      throw new Error(error);
    }
  }, DEBOUNCE_THROTTLE)
};

const walletApi = walletCip30.createWalletApi(
  wallet$.pipe(map((activeWallet) => activeWallet?.observableWallet || undefined)),
  confirmationCallback,
  { logger: console }
);

cip30.initializeBackgroundScript(
  { walletName: process.env.WALLET_NAME },
  { authenticator, logger: console, runtime, walletApi }
);

exposeApi<DappDataService>(
  {
    baseChannel: DAPP_CHANNELS.dappData,
    properties: {
      getCollateralRequest: RemoteApiPropertyType.MethodReturningPromise,
      getDappInfo: RemoteApiPropertyType.MethodReturningPromise
    },
    api$: of({
      getCollateralRequest: () => Promise.resolve(dappSetCollateral$.value),
      getDappInfo: () => Promise.resolve(dappInfo$.value)
    })
  },
  { logger: console, runtime }
);
