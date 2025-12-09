// mostly duplicated in v1 and lmp module, could be a shared library
import { RemoteApiProperties, RemoteApiPropertyType, WalletType } from '@cardano-sdk/web-extension';
import { Observable } from 'rxjs';
import { storage } from 'webextension-polyfill';
import { Language } from '@lace/translation';

export type BlockchainName = 'Bitcoin' | 'Cardano' | 'Midnight';

export type LmpBundleWallet = {
  walletId: string;
  walletName: string;
  walletIcon: string;
  encryptedRecoveryPhrase?: string;
  blockchain: BlockchainName;
  walletType: WalletType;
};

export type BundleAppApi = {
  wallets$: Observable<LmpBundleWallet[]>;
  activate(walletId: string): Promise<void>;
  language$: Observable<Language>;
  setLanguage(language: Language): Promise<void>;
};
export const bundleAppApiProps: RemoteApiProperties<BundleAppApi> = {
  wallets$: RemoteApiPropertyType.HotObservable,
  activate: RemoteApiPropertyType.MethodReturningPromise,
  language$: RemoteApiPropertyType.HotObservable,
  setLanguage: RemoteApiPropertyType.MethodReturningPromise
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
