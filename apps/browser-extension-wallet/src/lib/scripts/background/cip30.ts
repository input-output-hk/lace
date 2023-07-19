import { cip30 as walletCip30 } from '@cardano-sdk/wallet';
import { ensureUiIsOpenAndLoaded, getDappInfoFromLastActiveTab } from './util';
import { userPromptService } from './services/dappService';
import { Wallet } from '@lace/cardano';
import { authenticator } from './authenticator';
import { wallet$ } from './wallet';
import { runtime } from 'webextension-polyfill';
import { exposeApi, RemoteApiPropertyType, cip30 } from '@cardano-sdk/web-extension';
import { DAPP_CHANNELS } from '../../../utils/constants';
import { DappDataService } from '../types';
import { BehaviorSubject, of } from 'rxjs';
import { dappInfo$ } from './requestAccess';

const dappSignTxData$ = new BehaviorSubject<{ dappInfo: Wallet.DappInfo; tx: Wallet.Cardano.Tx }>(undefined);
const dappSignData$ = new BehaviorSubject<{
  dappInfo: Wallet.DappInfo;
  sign: { addr: Wallet.Cardano.PaymentAddress; payload: Wallet.HexBlob };
}>(undefined);

export const confirmationCallback: walletCip30.CallbackConfirmation = async (
  args: walletCip30.SignDataCallbackParams | walletCip30.SignTxCallbackParams | walletCip30.SubmitTxCallbackParams
): Promise<boolean> => {
  switch (args.type) {
    case walletCip30.Cip30ConfirmationCallbackType.SubmitTx: {
      // We don't need another callback for this callback, so long as we ensure callbacks for signing tx's
      // Remove this method once it is dropped from the SDK in future build
      // Also transactions can be submitted by the dApps externally
      // once they've got the witnesss keys if they construct their own transactions
      return Promise.resolve(true);
    }
    case walletCip30.Cip30ConfirmationCallbackType.SignTx: {
      try {
        const { logo, name, url } = await getDappInfoFromLastActiveTab();
        dappSignTxData$.next({ dappInfo: { logo, name, url }, tx: args.data });
        await ensureUiIsOpenAndLoaded('#/dapp/sign-tx');

        return userPromptService.allowSignTx();
      } catch (error) {
        console.log(error);
        // eslint-disable-next-line unicorn/no-useless-undefined
        dappSignTxData$.next(undefined);
        return Promise.reject();
      }
    }
    case walletCip30.Cip30ConfirmationCallbackType.SignData: {
      try {
        const { logo, name, url } = await getDappInfoFromLastActiveTab();
        dappSignData$.next({ dappInfo: { logo, name, url }, sign: args.data });
        await ensureUiIsOpenAndLoaded('#/dapp/sign-data');

        return userPromptService.allowSignData();
      } catch (error) {
        console.log(error);
        // eslint-disable-next-line unicorn/no-useless-undefined
        dappSignData$.next(undefined);
        return false;
      }
    }
    default:
      return Promise.reject();
  }
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
      getSignTxData: RemoteApiPropertyType.MethodReturningPromise,
      getSignDataData: RemoteApiPropertyType.MethodReturningPromise,
      getDappInfo: RemoteApiPropertyType.MethodReturningPromise
    },
    api$: of({
      getSignTxData: () => Promise.resolve(dappSignTxData$.value),
      getSignDataData: () => Promise.resolve(dappSignData$.value),
      getDappInfo: () => Promise.resolve(dappInfo$.value)
    })
  },
  { logger: console, runtime }
);
