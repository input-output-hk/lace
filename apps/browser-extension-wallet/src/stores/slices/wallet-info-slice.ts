import { BlockchainProviderSlice, SliceCreator, WalletInfoSlice } from '../types';
import { Wallet } from '@lace/cardano';
import { WalletManagerUi } from '@cardano-sdk/web-extension';

/**
 * has all wallet info related actions and states
 */
export const walletInfoSlice: SliceCreator<WalletInfoSlice & BlockchainProviderSlice, WalletInfoSlice> = ({
  set,
  get
}) => ({
  // Wallet info and storage
  setWalletInfo: (walletInfo) => set({ walletInfo }),
  setKeyAgentData: (keyAgentData) => set({ keyAgentData }),
  // Loaded wallet
  inMemoryWallet: undefined,
  cardanoWallet: undefined,
  walletManagerUi: undefined,
  setCardanoWallet: (wallet?: Wallet.CardanoWallet) => set({ inMemoryWallet: wallet?.wallet, cardanoWallet: wallet }),
  setWalletManagerUi: (walletManagerUi: WalletManagerUi) => set({ walletManagerUi }),
  setCurrentChain: (chain: Wallet.ChainName) => {
    set({ currentChain: Wallet.Cardano.ChainIds[chain], environmentName: chain });
    get().setBlockchainProvider(chain);
  },
  getKeyAgentType: () => get()?.cardanoWallet?.keyAgent.serializableData.__typename
});
