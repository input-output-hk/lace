import { BlockchainProviderSlice, SliceCreator, WalletInfoSlice } from '../types';
import { Wallet } from '@lace/cardano';

/**
 * has all wallet info related actions and states
 */
export const walletInfoSlice: SliceCreator<WalletInfoSlice & BlockchainProviderSlice, WalletInfoSlice> = ({
  set,
  get
}) => ({
  // Wallet info and storage
  setWalletInfo: (walletInfo) => set({ walletInfo }),
  // Loaded wallet
  inMemoryWallet: undefined,
  cardanoWallet: undefined,
  walletManager: undefined,
  initialHdDiscoveryCompleted: false,
  setAddressesDiscoveryCompleted: (addressesDiscoveryCompleted) =>
    set({ initialHdDiscoveryCompleted: addressesDiscoveryCompleted }),
  // eslint-disable-next-line unicorn/no-null
  hdDiscoveryStatus: null,
  setHdDiscoveryStatus: (hdDiscoveryStatus) => set({ hdDiscoveryStatus }),
  setCardanoWallet: (wallet?: Wallet.CardanoWallet) => set({ inMemoryWallet: wallet?.wallet, cardanoWallet: wallet }),
  setCurrentChain: (chain: Wallet.ChainName) => {
    set({ currentChain: Wallet.Cardano.ChainIds[chain], environmentName: chain });
    get().setBlockchainProvider(chain);
  },
  getWalletType: () => get()?.cardanoWallet?.source.wallet.type,
  setDeletingWallet: (deletingWallet: boolean) => set({ deletingWallet })
});
