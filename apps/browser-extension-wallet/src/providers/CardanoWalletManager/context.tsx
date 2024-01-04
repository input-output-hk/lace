import { Wallet } from '@lace/cardano';
import React, { createContext } from 'react';

export interface ICardanoWalletManager {
  createCardanoWallet: typeof Wallet.createCardanoWallet;
  restoreWallet: typeof Wallet.restoreWalletFromKeyAgent;
  destroyWallet?: () => Promise<void>;
}

interface WalletProviderProps {
  children: React.ReactNode;
  value?: ICardanoWalletManager;
}

// eslint-disable-next-line unicorn/no-null
const WalletManagerContext = createContext<ICardanoWalletManager | null>(null);

const defaultCardanoWalletManager: ICardanoWalletManager = {
  createCardanoWallet: Wallet.createCardanoWallet,
  restoreWallet: Wallet.restoreWalletFromKeyAgent
};

export const CardanoWalletManagerProvider = ({
  children,
  value = defaultCardanoWalletManager
}: WalletProviderProps): React.ReactElement => (
  <WalletManagerContext.Provider value={value}>{children}</WalletManagerContext.Provider>
);
