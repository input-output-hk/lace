// @ts-ignore
import { SetupBase } from '../src/features/staking/Setup/SetupBase';
// @ts-ignore
import { OutsideHandlesProvider, OutsideHandlesContextValue } from '../src/features/outside-handles-provider';
import React, { ReactNode } from 'react';

type StakingStorybookProviderProps = {
  children: ReactNode;
};

// TODO globalState.theme === ThemeState.Light ? 'light' : 'dark'
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
  backgroundServiceAPIContextSetWalletPassword: undefined,
  delegationStoreSetDelegationTxBuilder: undefined,
  delegationStoreSetDelegationTxFee: undefined,
  fetchCoinPricePriceResult: undefined,
  openExternalLink: undefined,
  password: undefined,
  submittingState: undefined,
  walletStoreGetKeyAgentType: undefined,
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
  multidelegationFirstVisitSincePortfolioPersistence: undefined,
  triggerMultidelegationFirstVisitSincePortfolioPersistence: undefined,
  walletAddress: undefined,
  currentChain: undefined,
};

export const StakingStorybookProvider = ({ children }: StakingStorybookProviderProps) => (
  <OutsideHandlesProvider {...outsideHandlesMocks}>
    <SetupBase theme={'light'}>{children}</SetupBase>
  </OutsideHandlesProvider>
);
