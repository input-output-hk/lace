import { Wallet } from '@lace/cardano';
import React, { createContext, useContext } from 'react';

export interface ICardanoWalletManager {
  createCardanoWallet: typeof Wallet.createCardanoWallet;
  createHardwareWallet: typeof Wallet.createHardwareWallet;
  restoreWallet: typeof Wallet.restoreWalletFromKeyAgent;
  destroyWallet?: () => Promise<void>;
}

interface WalletProviderProps {
  children: React.ReactNode;
  value?: ICardanoWalletManager;
}

// eslint-disable-next-line unicorn/no-null
const WalletManagerContext = createContext<ICardanoWalletManager | null>(null);

export const useCardanoWalletManagerContext = (): ICardanoWalletManager => {
  const context = useContext(WalletManagerContext);
  if (context === null) throw new Error('Wallet Manager context not defined');
  return context;
};

const defaultCardanoWalletManager: ICardanoWalletManager = {
  createCardanoWallet: Wallet.createCardanoWallet,
  createHardwareWallet: Wallet.createHardwareWallet,
  restoreWallet: Wallet.restoreWalletFromKeyAgent
};

export const CardanoWalletManagerProvider = ({
  children,
  value = defaultCardanoWalletManager
}: WalletProviderProps): React.ReactElement => (
  <WalletManagerContext.Provider value={value}>{children}</WalletManagerContext.Provider>
);
