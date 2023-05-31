import create, { UseStore } from 'zustand';
import { Wallet } from '@lace/cardano';
import { WalletStore } from './types';
import { WalletLocked } from '../types';
import {
  BlockchainProviderFactory,
  walletActivitiesSlice,
  networkSlice,
  stakePoolSearchSlice,
  walletInfoSlice,
  lockSlice,
  transactionDetailSlice,
  uiSlice,
  blockchainProviderSlice
} from './slices';
import { assetDetailsSlice } from './slices/asset-details-slice';
import { AppMode } from '@src/utils/constants';
import { config } from '@src/config';

const { CHAIN } = config();

export const createWalletStore = (
  walletLock: WalletLocked,
  currentChainName: Wallet.ChainName,
  appMode: AppMode,
  blockchainProviderFactory?: BlockchainProviderFactory
): UseStore<WalletStore> => {
  const currentChain = Wallet.Cardano.ChainIds[currentChainName || CHAIN];
  return create((set, get) => ({
    currentChain,
    environmentName: currentChainName || CHAIN,
    ...blockchainProviderSlice({ set, get }, { currentChainName, blockchainProviderFactory }),
    ...uiSlice({ set, get }, { currentChain, appMode }),
    ...walletInfoSlice({ set, get }),
    ...walletActivitiesSlice({ set, get }),
    ...networkSlice({ set, get }),
    ...stakePoolSearchSlice({ set, get }),
    ...lockSlice({ set, get }, walletLock),
    ...transactionDetailSlice({ set, get }),
    ...assetDetailsSlice({ set, get })
  }));
};
