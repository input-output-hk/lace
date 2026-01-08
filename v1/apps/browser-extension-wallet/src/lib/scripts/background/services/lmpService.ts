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
import type { ChangeThemeData } from '../../types/background-service';

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

// Initialize language from storage on startup
(async () => {
  try {
    const storage = await getBackgroundStorage();
    if (storage.languageChoice) {
      language$.next(storage.languageChoice);
    }
    if (storage.colorScheme) {
      colorScheme$.next(storage.colorScheme);
    }
  } catch (error) {
    logger.error('Failed to initialize language from storage:', error);
  }
})();

// Subscribe to v1 UI language changes via requestMessage$
requestMessage$.subscribe(({ type, data }) => {
  if (type === MessageTypes.CHANGE_LANGUAGE) {
    language$.next(data as Language);
  }
  if (type === MessageTypes.CHANGE_THEME) {
    colorScheme$.next((data as ChangeThemeData).theme);
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
      const bitcoinActiveWallet = await firstValueFrom(bitcoinWalletManager.activeWallet$);
      const cardanoActiveWallet = await firstValueFrom(walletManager.activeWallet$);
      if (isBitcoinWallet(wallet)) {
        await setBackgroundStorage({
          activeBlockchain: 'bitcoin'
        });
        await bitcoinWalletManager.activate({
          network:
            // If Bitcoin wallet is active, use the same chainID
            // If Cardano wallet is active, use the same network type
            // Otherwise use Mainnet
            bitcoinActiveWallet?.props.network ||
            cardanoActiveWallet?.props.chainId.networkId === Wallet.Cardano.NetworkId.Testnet
              ? Bitcoin.Network.Testnet
              : Bitcoin.Network.Mainnet,
          walletId,
          accountIndex
        });
      } else {
        await setBackgroundStorage({
          activeBlockchain: 'cardano'
        });
        await walletManager.activate({
          chainId:
            // If Cardano wallet is active, use the same chainID
            // If Bitcoin wallet is active, use the same network type (preprod if testnet)
            // Otherwise use Mainnet
            cardanoActiveWallet?.props.chainId || bitcoinActiveWallet?.props.network === Bitcoin.Network.Testnet
              ? Wallet.Cardano.ChainIds.Preprod
              : Wallet.Cardano.ChainIds.Mainnet,
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
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any)[v1ApiGlobalProperty] = api;
