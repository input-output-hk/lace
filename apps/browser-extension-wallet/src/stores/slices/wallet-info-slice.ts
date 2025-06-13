import { WalletType } from '@cardano-sdk/web-extension';
import { BlockchainProviderSlice, SliceCreator, WalletInfoSlice } from '../types';
import { Wallet } from '@lace/cardano';
import { ObservableWalletState } from '@hooks/useWalletState';
import { isSharedWallet } from '@lace/core';
import { isNamiWallet } from '@src/views/nami-mode/utils';

/**
 * has all wallet info related actions and states
 */
export const walletInfoSlice: SliceCreator<WalletInfoSlice & BlockchainProviderSlice, WalletInfoSlice> = ({
  set,
  get
}) => ({
  // Wallet info and storage
  setWalletInfo: (walletInfo) => set({ walletInfo }),
  setManageAccountsWallet: (manageAccountsWallet) => set({ manageAccountsWallet }),
  // Loaded wallet
  manageAccountsWallet: undefined,
  inMemoryWallet: undefined,
  cardanoWallet: undefined,
  bitcoinWallet: undefined,
  isBitcoinWallet: undefined,
  walletState: undefined,
  setWalletState: (walletState?: ObservableWalletState) => set({ walletState }),
  walletManager: undefined,
  initialHdDiscoveryCompleted: false,
  isInMemoryWallet: undefined,
  isHardwareWallet: undefined,
  isSharedWallet: undefined,
  isNamiWallet: undefined,
  walletDisplayInfo: undefined,
  walletType: undefined,
  stayOnAllDonePage: false,
  setAddressesDiscoveryCompleted: (addressesDiscoveryCompleted) =>
    set({ initialHdDiscoveryCompleted: addressesDiscoveryCompleted }),
  // eslint-disable-next-line unicorn/no-null
  hdDiscoveryStatus: null,
  setHdDiscoveryStatus: (hdDiscoveryStatus) => set({ hdDiscoveryStatus }),
  setCardanoWallet: (wallet?: Wallet.CardanoWallet) =>
    set({
      inMemoryWallet: wallet?.wallet,
      cardanoWallet: wallet,
      walletType: wallet?.source.wallet.type,
      isInMemoryWallet: wallet?.source.wallet.type === WalletType.InMemory,
      isHardwareWallet: [WalletType.Ledger, WalletType.Trezor].includes(wallet?.source.wallet.type),
      isSharedWallet: isSharedWallet(wallet),
      isNamiWallet: isNamiWallet(wallet)
    }),
  setWalletDisplayInfo: (info?: Wallet.WalletDisplayInfo) =>
    set({
      walletDisplayInfo: info
    }),
  setIsBitcoinWallet: (isBitcoinWallet: boolean) =>
    set({
      isBitcoinWallet
    }),
  setCurrentChain: (chain: Wallet.ChainName) => {
    set({ currentChain: Wallet.Cardano.ChainIds[chain], environmentName: chain });
    get().setBlockchainProvider(chain);
  },
  setDeletingWallet: (deletingWallet: boolean) => set({ deletingWallet }),
  setStayOnAllDonePage: (stayOnAllDonePage: boolean) => set({ stayOnAllDonePage })
});
