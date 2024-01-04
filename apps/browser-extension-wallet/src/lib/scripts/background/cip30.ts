import { cip30 as walletCip30 } from '@cardano-sdk/wallet';
import { ensureUiIsOpenAndLoaded, getDappInfoFromLastActiveTab } from './util';
import { userPromptService } from './services/dappService';
import { authenticator } from './authenticator';
import { wallet$ } from './wallet';
import { runtime } from 'webextension-polyfill';
import { exposeApi, RemoteApiPropertyType, cip30 } from '@cardano-sdk/web-extension';
import { DAPP_CHANNELS } from '../../../utils/constants';
import { DappDataService } from '../types';
import { BehaviorSubject, of } from 'rxjs';
import { APIErrorCode, ApiError } from '@cardano-sdk/dapp-connector';
import { Wallet } from '@lace/cardano';
import pDebounce from 'p-debounce';
import { dappInfo$ } from './requestAccess';

const DEBOUNCE_THROTTLE = 500;

const dappSetCollateral$ = new BehaviorSubject<{
  dappInfo: Wallet.DappInfo;
  collateralRequest: walletCip30.GetCollateralCallbackParams['data'];
}>(undefined);

const getOrigin = (url: string): URL['hostname'] => new URL(url).origin;

export const confirmationCallback: walletCip30.CallbackConfirmation = {
  submitTx: async () =>
    // We don't need another callback for this callback, so long as we ensure callbacks for signing tx's
    // Remove this method once it is dropped from the SDK in future build
    // Also transactions can be submitted by the dApps externally
    // once they've got the witnesss keys if they construct their own transactions
    Promise.resolve(true),
  signTx: pDebounce(async () => {
    try {
      await ensureUiIsOpenAndLoaded('#/dapp/sign-tx');

      return userPromptService.allowSignTx();
    } catch (error) {
      console.error(error);
      return Promise.reject(new ApiError(APIErrorCode.InternalError, 'Unable to sign transaction'));
    }
  }, DEBOUNCE_THROTTLE),
  signData: pDebounce(async () => {
    try {
      await ensureUiIsOpenAndLoaded('#/dapp/sign-data');

      return userPromptService.allowSignData();
    } catch (error) {
      console.error(error);
      // eslint-disable-next-line unicorn/no-useless-undefined
      return Promise.reject(new ApiError(APIErrorCode.InternalError, 'Unable to sign data'));
    }
  }, DEBOUNCE_THROTTLE),
  getCollateral: pDebounce(async (args) => {
    try {
      const { logo, name, url } = await getDappInfoFromLastActiveTab(args.sender);
      dappSetCollateral$.next({ dappInfo: { logo, name, url: getOrigin(url) }, collateralRequest: args.data });
      await ensureUiIsOpenAndLoaded('#/dapp/set-collateral');

      return userPromptService.getCollateralRequest();
    } catch (error) {
      // eslint-disable-next-line unicorn/no-useless-undefined
      dappSetCollateral$.next(undefined);
      throw new Error(error);
    }
  }, DEBOUNCE_THROTTLE)
};

const walletApi = walletCip30.createWalletApi(wallet$, confirmationCallback, { logger: console });

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
