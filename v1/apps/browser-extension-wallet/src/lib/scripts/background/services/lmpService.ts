/* eslint-disable @typescript-eslint/no-var-requires */
import { BundleAppApi, LmpBundleWallet, v1ApiGlobalProperty } from '@src/utils/lmp';
import { firstValueFrom, map } from 'rxjs';
import { bitcoinWalletManager, walletManager, walletRepository } from '../wallet';
import { AnyBip32Wallet, AnyWallet, InMemoryWallet, WalletType } from '@cardano-sdk/web-extension';
import { logger } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { setBackgroundStorage } from '../storage';
import { Bitcoin } from '@lace/bitcoin';

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

const api: BundleAppApi = {
  wallets$: walletRepository.wallets$.pipe(
    map((wallets) =>
      wallets.map(
        (wallet): LmpBundleWallet => ({
          // TODO: icon should be different based on wallet type (same as in v1 dropdown menu)
          walletIcon: isBitcoinWallet(wallet) ? bitcoinLogo : cardanoLogo,
          walletId: wallet.walletId,
          walletName: wallet.metadata.name,
          encryptedRecoveryPhrase: isInMemoryWallet(wallet) ? wallet.encryptedSecrets.keyMaterial : undefined
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
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any)[v1ApiGlobalProperty] = api;
