import { RemoteApiProperties, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { Observable } from 'rxjs';
import { storage } from 'webextension-polyfill';
import { Language } from '@lace/translation';
import type { themes as ColorScheme } from '../providers/ThemeProvider/types';

export type BundleAppApi = {
  wallets$: Observable<Wallet.LmpBundleWallet[]>;
  activate(walletId: string): Promise<void>;
  language$: Observable<Language>;
  setLanguage(language: Language): Promise<void>;
  colorScheme$: Observable<ColorScheme>;
  setColorScheme(colorScheme: ColorScheme): Promise<void>;
};
export const bundleAppApiProps: RemoteApiProperties<BundleAppApi> = {
  wallets$: RemoteApiPropertyType.HotObservable,
  activate: RemoteApiPropertyType.MethodReturningPromise,
  language$: RemoteApiPropertyType.HotObservable,
  setLanguage: RemoteApiPropertyType.MethodReturningPromise,
  colorScheme$: RemoteApiPropertyType.HotObservable,
  setColorScheme: RemoteApiPropertyType.MethodReturningPromise
};

export const lmpApiBaseChannel = 'bundle-lmp';
export const v1ApiGlobalProperty = 'bundleV1';
export const STORAGE_KEY = {
  APP_MODE: 'lace-app-mode',
  ONBOARDING_PARAMS: 'lace-lmp-onboarding-params',
  CAME_FROM_LMP: 'lace-came-from-lmp'
};

export type OnboardingParams = { mode: 'create' } | { mode: 'restore' };

export const onboardingParamsStorage = {
  set: (params: OnboardingParams): Promise<void> => storage.local.set({ [STORAGE_KEY.ONBOARDING_PARAMS]: params }),
  get: async (): Promise<OnboardingParams | undefined> => {
    const result = await storage.local.get(STORAGE_KEY.ONBOARDING_PARAMS);
    return result[STORAGE_KEY.ONBOARDING_PARAMS] as OnboardingParams | undefined;
  },
  clear: (): Promise<void> => storage.local.remove(STORAGE_KEY.ONBOARDING_PARAMS)
};
export enum APP_MODE {
  LMP = 'LMP',
  V1 = 'V1'
}

export const lmpModeStorage = {
  set: (mode: APP_MODE): Promise<void> => storage.local.set({ [STORAGE_KEY.APP_MODE]: mode })
};

export const cameFromLmpStorage = {
  set: (): Promise<void> => storage.local.set({ [STORAGE_KEY.CAME_FROM_LMP]: true }),
  get: async (): Promise<boolean> => {
    const result = await storage.local.get(STORAGE_KEY.CAME_FROM_LMP);
    return !!result[STORAGE_KEY.CAME_FROM_LMP];
  },
  clear: (): Promise<void> => storage.local.remove(STORAGE_KEY.CAME_FROM_LMP)
};

export const decryptMnemonic = async (encryptedRecoveryPhrase: string, password: string): Promise<string[]> => {
  const passphrase = new Uint8Array(Buffer.from(password));
  const mnemonic = await Wallet.util.decryptMnemonic(encryptedRecoveryPhrase, passphrase);
  Wallet.util.clearBytes(passphrase);
  return mnemonic;
};
