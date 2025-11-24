// mostly duplicated in v1 and lmp module, could be a shared library
import { RemoteApiProperties, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { Observable } from 'rxjs';
import { storage } from 'webextension-polyfill';

export type LmpBundleWallet = {
  walletId: string;
  walletName: string;
  walletIcon: string;
  encryptedRecoveryPhrase?: string;
};

export type BundleAppApi = {
  wallets$: Observable<LmpBundleWallet[]>;
  activate(walletId: string): Promise<void>;
};
export const bundleAppApiProps: RemoteApiProperties<BundleAppApi> = {
  wallets$: RemoteApiPropertyType.HotObservable,
  activate: RemoteApiPropertyType.MethodReturningPromise
};
export const lmpApiBaseChannel = 'bundle-lmp';
export const v1ApiGlobalProperty = 'bundleV1';
export const STORAGE_KEY = {
  APP_MODE: 'lace-app-mode'
};
export enum APP_MODE {
  LMP = 'LMP',
  V1 = 'V1'
}

export const lmpModeStorage = {
  set: (mode: APP_MODE): Promise<void> => storage.local.set({ [STORAGE_KEY.APP_MODE]: mode })
};
