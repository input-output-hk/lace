/* eslint-disable max-depth */
/* eslint-disable sonarjs/no-duplicate-string */
import { useCallback, useReducer } from 'react';
import { storage } from 'webextension-polyfill';
import isNil from 'lodash/isNil';
import { Wallet } from '@light-wallet/cardano';
import { ExtensionStorage } from '@lib/scripts/types';
import { ILocalStorage } from '@src/types';
import { deleteFromLocalStorage, getValueFromLocalStorage, saveValueInLocalStorage } from '@src/utils/local-storage';
import { useWalletStore, WalletStore } from '@src/stores';
import { isWalletStorageValid, isKeyAgentsByChainValid, isKeyAgentDataValid } from '@src/utils/data-validators';
import { config } from '@src/config';

const { CHAIN } = config();

export type DataCheckState =
  | { checkState: 'not-checked' | 'checking' }
  | { checkState: 'checked'; result: { valid: true } | { valid: false; error: string } };
export type DataCheckAction = { type: 'not-checked' | 'checking' | 'valid' } | { type: 'error'; error: string };

export type DataCheckDispatcher = (dispatcher: React.Dispatch<DataCheckAction>, store: WalletStore) => Promise<void>;
export type UseDataCheck = [DataCheckState, () => Promise<void>];

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

// eslint-disable-next-line complexity, sonarjs/cognitive-complexity
export const dataCheckDispatcher: DataCheckDispatcher = async (dispatcher, walletStore) => {
  dispatcher({ type: 'checking' });
  try {
    const lock = getValueFromLocalStorage<ILocalStorage, 'lock'>('lock'); // Not in HW
    const keyAgentData = getValueFromLocalStorage<ILocalStorage, 'keyAgentData'>('keyAgentData');
    const walletStorage = getValueFromLocalStorage<ILocalStorage, 'wallet'>('wallet');
    const appSettings = getValueFromLocalStorage<ILocalStorage, 'appSettings'>('appSettings');
    const extensionStorage = (await storage.local.get('BACKGROUND_STORAGE')) as Pick<
      ExtensionStorage,
      'BACKGROUND_STORAGE'
    >;

    const keyAgentsByChain = extensionStorage.BACKGROUND_STORAGE?.keyAgentsByChain;

    // No key agent data and no lock means no wallet so BACKGROUND_STORAGE should not exist, delete and don't fail
    if (isNil(keyAgentData) && isNil(lock) && !isNil(extensionStorage.BACKGROUND_STORAGE)) {
      await storage.local.remove('BACKGROUND_STORAGE');
    }
    // We have a wallet if:
    //   - there is a keyAgentData present (unlocked wallet), regardless of lock (HW wallets have no lock)
    //   - or there's no keyAgentData but there is a lock (locked InMemory wallet)
    const isWalletCreated = !isNil(keyAgentData) || !isNil(lock);
    if (isWalletCreated) {
      // If there is no wallet name stored or is invalid, fallback to "Lace" without failing the data check
      if (isNil(walletStorage) || !isWalletStorageValid(walletStorage)) {
        saveValueInLocalStorage({ key: 'wallet', value: { name: 'Lace' } });
      }
      // If we have keyAgentsByChain, we should validate it
      if (!isNil(keyAgentsByChain) && !isKeyAgentsByChainValid(keyAgentsByChain)) {
        return dispatcher({ type: 'error', error: 'Invalid key agents by chain' });
      }

      // If wallet is not locked or is a HW wallet
      if (!isNil(keyAgentData)) {
        // We should validate the keyAgentData
        if (!isKeyAgentDataValid(keyAgentData)) return dispatcher({ type: 'error', error: 'Invalid key agent data' });

        const isInMemoryWallet = keyAgentData.__typename === Wallet.KeyManagement.KeyAgentType.InMemory;
        if (isInMemoryWallet) {
          // InMemory wallets should always have a lock
          if (isNil(lock)) return dispatcher({ type: 'error', error: 'Missing lock for InMemory wallet' });
          // If there is lock, but there is no keyAgentsByChain network switching won't work
          if (isNil(keyAgentsByChain)) {
            // Force-lock the wallet to restore keyAgentsByChain on unlock, but don't fail the data check
            deleteFromLocalStorage('keyAgentData');
          }
        } else {
          // With no keyAgentsByChain network switching won't work and with no lock keyAgentsByChain can't be recovered
          // eslint-disable-next-line no-lonely-if
          if (isNil(keyAgentsByChain)) return dispatcher({ type: 'error', error: 'Missing key agents by chain' });
        }
      }

      if (isNil(appSettings?.chainName)) {
        // If there is no appSettings or no chainName when there is a wallet save current network or the default one
        saveValueInLocalStorage({ key: 'appSettings', value: { chainName: walletStore?.environmentName || CHAIN } });
      }
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

  const performDataCheck = useCallback(async () => {
    await checkData(dispatch, store);
  }, [checkData, store]);

  return [dataCheckState, performDataCheck];
};
