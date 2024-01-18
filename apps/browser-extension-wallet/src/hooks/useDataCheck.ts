/* eslint-disable max-depth */
/* eslint-disable sonarjs/no-duplicate-string */
import { useCallback, useReducer } from 'react';
import { storage } from 'webextension-polyfill';
import isNil from 'lodash/isNil';
import { ExtensionStorage } from '@lib/scripts/types';
import { ILocalStorage } from '@src/types';
import { getValueFromLocalStorage, saveValueInLocalStorage } from '@src/utils/local-storage';
import { useWalletStore, WalletStore } from '@src/stores';
import { config } from '@src/config';
import { firstValueFrom } from 'rxjs';
import { WalletRepositoryApi } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';

const { CHAIN } = config();

export type DataCheckState =
  | { checkState: 'not-checked' | 'checking' }
  | { checkState: 'checked'; result: { valid: true } | { valid: false; error: string } };
export type DataCheckAction = { type: 'not-checked' | 'checking' | 'valid' } | { type: 'error'; error: string };

export type DataCheckDispatcher = (
  walletRepositoryApi: WalletRepositoryApi<Wallet.WalletMetadata, Wallet.AccountMetadata>,
  dispatcher: React.Dispatch<DataCheckAction>,
  store: WalletStore
) => Promise<void>;
export type UseDataCheck = [
  DataCheckState,
  (walletRepository: WalletRepositoryApi<Wallet.WalletMetadata, Wallet.AccountMetadata>) => Promise<void>
];

const dataCheckReducer = (state: DataCheckState, action: DataCheckAction): DataCheckState => {
  switch (action.type) {
    case 'not-checked':
      return { checkState: 'not-checked' };
    case 'checking':
      return { checkState: 'checking' };
    case 'valid':
      return { checkState: 'checked', result: { valid: true } };
    case 'error':
      return { checkState: 'checked', result: { valid: false, error: action.error } };
    default:
      return state;
  }
};

export const dataCheckDispatcher: DataCheckDispatcher = async (walletRepository, dispatcher, walletStore) => {
  dispatcher({ type: 'checking' });
  try {
    const appSettings = getValueFromLocalStorage<ILocalStorage, 'appSettings'>('appSettings');
    const wallets = await firstValueFrom(walletRepository.wallets$);
    const extensionStorage = (await storage.local.get('BACKGROUND_STORAGE')) as Pick<
      ExtensionStorage,
      'BACKGROUND_STORAGE'
    >;

    const isWalletCreated = wallets.length > 0;
    // No wallets means BACKGROUND_STORAGE should not exist, delete and don't fail
    if (!isWalletCreated && !isNil(extensionStorage.BACKGROUND_STORAGE)) {
      await storage.local.remove('BACKGROUND_STORAGE');
    }
    if (isWalletCreated && isNil(appSettings?.chainName)) {
      // If there is no appSettings or no chainName when there is a wallet save current network or the default one
      saveValueInLocalStorage({ key: 'appSettings', value: { chainName: walletStore?.environmentName || CHAIN } });
    }

    return dispatcher({ type: 'valid' });
  } catch (error) {
    return dispatcher({ type: 'error', error: error?.message ?? 'Something went wrong' });
  }
};

const INITIAL_STATE: DataCheckState = { checkState: 'not-checked' };

export const useDataCheck = (checkData = dataCheckDispatcher): UseDataCheck => {
  const store = useWalletStore();
  const [dataCheckState, dispatch] = useReducer(dataCheckReducer, INITIAL_STATE);

  const performDataCheck = useCallback(
    async (walletRepository: WalletRepositoryApi<Wallet.WalletMetadata, Wallet.AccountMetadata>) => {
      await checkData(walletRepository, dispatch, store);
    },
    [checkData, store]
  );

  return [dataCheckState, performDataCheck];
};
