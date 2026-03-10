/* eslint-disable @typescript-eslint/no-var-requires */
import { BundleAppApi, v1ApiGlobalProperty } from '@src/utils/lmp';
import { BehaviorSubject, firstValueFrom, map } from 'rxjs';
import { bitcoinWalletManager, walletManager, walletRepository } from '../wallet';
import { AnyBip32Wallet, AnyWallet, InMemoryWallet, WalletType } from '@cardano-sdk/web-extension';
import { logger } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { getBackgroundStorage, setBackgroundStorage } from '../storage';
import { Bitcoin } from '@lace/bitcoin';
import { Language } from '@lace/translation';
import { requestMessage$ } from './utilityServices';
import { MessageTypes } from '../../types';

import type { themes as ColorScheme } from '../../../../providers/ThemeProvider/types';
import type { ChangeThemeData, NetworkType } from '../../types/background-service';

const cardanoLogo = require('../../../../assets/icons/browser-view/cardano-logo.svg').default;
const bitcoinLogo = require('../../../../assets/icons/browser-view/bitcoin-logo.svg').default;

const isBitcoinWallet = (
  wallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>
): wallet is InMemoryWallet<Wallet.WalletMetadata, Wallet.AccountMetadata> =>
  wallet.type === WalletType.InMemory && wallet.blockchainName === 'Bitcoin';
const isBip32Wallet = (
  wallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>
): wallet is AnyBip32Wallet<Wallet.WalletMetadata, Wallet.AccountMetadata> => wallet.type !== WalletType.Script;
const isInMemoryWallet = (
  wallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>
): wallet is InMemoryWallet<Wallet.WalletMetadata, Wallet.AccountMetadata> => wallet.type === WalletType.InMemory;

// BehaviorSubject for language state, initialized with default 'en'
export const language$ = new BehaviorSubject<Language>(Language.en);
export const colorScheme$ = new BehaviorSubject<ColorScheme>('light');
export const networkType$ = new BehaviorSubject<NetworkType>('mainnet');

// Initialize from storage on startup
(async () => {
  try {
    const storage = await getBackgroundStorage();
    if (storage.languageChoice) {
      language$.next(storage.languageChoice);
    }
    if (storage.colorScheme) {
      colorScheme$.next(storage.colorScheme);
    }
    if (storage.networkType) {
      networkType$.next(storage.networkType);
    }
  } catch (error) {
    logger.error('Failed to initialize from storage:', error);
  }
})();

// Subscribe to v1 UI changes via requestMessage$
requestMessage$.subscribe(({ type, data }) => {
  if (type === MessageTypes.CHANGE_LANGUAGE) {
    language$.next(data as Language);
  }
  if (type === MessageTypes.CHANGE_THEME) {
    colorScheme$.next((data as ChangeThemeData).theme);
  }
  // Only update networkType$ when the network HAS actually changed (source of truth)
  // CHANGE_NETWORK is a REQUEST to change, NETWORK_CHANGED is a notification that it changed
  if (type === MessageTypes.NETWORK_CHANGED) {
    networkType$.next(data as NetworkType);
  }
});

const api: BundleAppApi = {
  wallets$: walletRepository.wallets$.pipe(
    map((wallets) =>
      wallets.map(
        (wallet): Wallet.LmpBundleWallet => ({
          walletIcon: isBitcoinWallet(wallet) ? bitcoinLogo : cardanoLogo,
          walletId: wallet.walletId,
          walletName: wallet.metadata.name,
          encryptedRecoveryPhrase: isInMemoryWallet(wallet) ? wallet.encryptedSecrets.keyMaterial : undefined,
          blockchain: isBitcoinWallet(wallet) ? 'Bitcoin' : 'Cardano',
          walletType: wallet.type
        })
      )
    )
  ),
  activate: async (walletId): Promise<void> => {
    const wallets = await firstValueFrom(walletRepository.wallets$);
    const wallet = wallets.find((w) => w.walletId === walletId);
    if (!wallet) {
      logger.warn('Failed to activate wallet: not found', walletId);
      return;
    }

    if (isBip32Wallet(wallet)) {
      const accountIndex = wallet.metadata.lastActiveAccountIndex || 0;
      const cardanoActiveWallet = await firstValueFrom(walletManager.activeWallet$);
      const desiredNetworkType = await firstValueFrom(networkType$);

      if (isBitcoinWallet(wallet)) {
        await setBackgroundStorage({
          activeBlockchain: 'bitcoin'
        });
        await bitcoinWalletManager.activate({
          network: desiredNetworkType === 'testnet' ? Bitcoin.Network.Testnet : Bitcoin.Network.Mainnet,
          walletId,
          accountIndex
        });
      } else {
        await setBackgroundStorage({
          activeBlockchain: 'cardano'
        });
        await walletManager.activate({
          chainId:
            desiredNetworkType === 'mainnet'
              ? Wallet.Cardano.ChainIds.Mainnet
              : cardanoActiveWallet?.props.chainId ?? Wallet.Cardano.ChainIds.Preprod,
          walletId,
          accountIndex
        });
      }
    }
  },
  language$,
  setLanguage: async (language: Language): Promise<void> => {
    language$.next(language);
    await setBackgroundStorage({ languageChoice: language });
    requestMessage$.next({ type: MessageTypes.CHANGE_LANGUAGE, data: language });
  },
  colorScheme$,
  setColorScheme: async (colorScheme: ColorScheme): Promise<void> => {
    colorScheme$.next(colorScheme);
    await setBackgroundStorage({ colorScheme });
    requestMessage$.next({ type: MessageTypes.CHANGE_THEME, data: { theme: colorScheme } });
  },
  networkType$,
  setNetworkType: async (networkType: NetworkType): Promise<void> => {
    // Switch Cardano wallets
    const cardanoChainId =
      networkType === 'mainnet' ? Wallet.Cardano.ChainIds.Mainnet : Wallet.Cardano.ChainIds.Preprod;
    await walletManager.switchNetwork(cardanoChainId);

    // Switch Bitcoin wallets
    const btcNetwork = networkType === 'mainnet' ? Bitcoin.Network.Mainnet : Bitcoin.Network.Testnet;
    await bitcoinWalletManager.switchNetwork(btcNetwork);

    await setBackgroundStorage({ networkType });
    networkType$.next(networkType);
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any)[v1ApiGlobalProperty] = api;
