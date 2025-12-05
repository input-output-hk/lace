import React, { createContext, useContext } from 'react';

export enum WalletSetupFlow {
  ONBOARDING,
  ADD_WALLET,
  ADD_SHARED_WALLET
}

interface Props {
  children: React.ReactNode;
  flow: WalletSetupFlow;
}
// eslint-disable-next-line unicorn/no-null
const WalletSetupFlowContext = createContext<WalletSetupFlow>(WalletSetupFlow.ONBOARDING);

export const useWalletSetupFlow = (): WalletSetupFlow => {
  const context = useContext(WalletSetupFlowContext);
  if (context === null) throw new Error('WalletSetupFlowContext not defined');
  return context;
};

export const WalletSetupFlowProvider = ({ children, flow }: Props): React.ReactElement => (
  <WalletSetupFlowContext.Provider value={flow}>{children}</WalletSetupFlowContext.Provider>
);
