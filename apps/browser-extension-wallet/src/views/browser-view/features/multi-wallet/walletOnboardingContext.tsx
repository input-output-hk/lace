import { createContext, useContext } from 'react';
import { SetFormDirty, WalletOnboardingPostHogActions } from './types';

type ContextValue = {
  aliasEventRequired: boolean;
  mergeEventRequired: boolean;
  forgotPasswordFlowActive: boolean;
  postHogActions: WalletOnboardingPostHogActions;
  setFormDirty: SetFormDirty;
};

// eslint-disable-next-line unicorn/no-null
const context = createContext<ContextValue>(null);

export const useWalletOnboarding = (): ContextValue => {
  const state = useContext(context);
  if (state === null) throw new Error('WalletOnboardingContext not defined');
  return state;
};

export const WalletOnboardingProvider = context.Provider;
