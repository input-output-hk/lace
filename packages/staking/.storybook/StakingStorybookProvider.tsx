// @ts-ignore
import { SetupBase } from '../src/features/staking/Setup/SetupBase';
// @ts-ignore
import { OutsideHandlesContextValue, OutsideHandlesProvider } from '../src/features/outside-handles-provider';
import React, { ReactNode } from 'react';
import { ThemeColorScheme } from '@input-output-hk/lace-ui-toolkit';

type StakingStorybookProviderProps = {
  children: ReactNode;
};

// Extend mocks if needed
const outsideHandlesMocks: OutsideHandlesContextValue = {
  analytics: {
    sendPageNavigationEvent: async () => {
      console.log('Analytics', 'sendPageNavigationEvent');
    },
    sendAliasEvent: async () => {
      console.log('Analytics', 'sendAliasEvent');
    },
    sendEventToPostHog: async (action, properties) => {
      console.log('Analytics', action, properties);
    },
  },
  delegationStoreSetDelegationTxBuilder: undefined,
  delegationStoreSetDelegationTxFee: undefined,
  fetchCoinPricePriceResult: undefined,
  openExternalLink: undefined,
  password: undefined,
  submittingState: undefined,
  walletStoreWalletType: undefined,
  walletStoreInMemoryWallet: undefined,
  walletStoreWalletActivities: undefined,
  walletStoreWalletActivitiesStatus: undefined,
  walletStoreWalletUICardanoCoin: undefined,
  walletManagerExecuteWithPassword: undefined,
  walletStoreStakePoolSearchResults: undefined,
  walletStoreStakePoolSearchResultsStatus: undefined,
  walletStoreFetchStakePools: undefined,
  walletStoreFetchNetworkInfo: undefined,
  walletStoreBlockchainProvider: undefined,
  currencyStoreFiatCurrency: undefined,
  compactNumber: undefined,
  multidelegationFirstVisit: undefined,
  triggerMultidelegationFirstVisit: undefined,
  multidelegationDAppCompatibility: undefined,
  triggerMultidelegationDAppCompatibility: undefined,
  multidelegationFirstVisitSincePortfolioPersistence: undefined,
  triggerMultidelegationFirstVisitSincePortfolioPersistence: undefined,
  walletAddress: undefined,
  walletName: undefined,
  currentChain: undefined,
  isSharedWallet: undefined,
  eraSlotDateTime: undefined,
};

// Please use <LocalThemeProvider> to present dark theme
export const StakingStorybookProvider = ({ children }: StakingStorybookProviderProps) => {
  return (
    <OutsideHandlesProvider {...outsideHandlesMocks}>
      <SetupBase theme={ThemeColorScheme.Light}>{children}</SetupBase>
    </OutsideHandlesProvider>
  );
};
