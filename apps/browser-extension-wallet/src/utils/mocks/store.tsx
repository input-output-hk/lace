import React from 'react';
import create, { GetState, SetState } from 'zustand';
import { Wallet } from '@lace/cardano';
import { mockKeyAgentDataTestnet, mockWalletInfoTestnet } from './test-helpers';
import { cardanoCoin, APP_MODE_BROWSER } from '@utils/constants';
import { StateStatus, WalletStore } from '@stores/types';
import { StoreProvider } from '@stores';
import { WalletManagerUi } from '@cardano-sdk/web-extension';
import { NetworkConnectionStates } from '@src/types';
import { mockBlockchainProviders } from './blockchain-providers';

interface StoreProviderProps {
  children: React.ReactNode;
  mockStore: WalletStore;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customSlice?: (set: SetState<any>, get: GetState<any>) => Partial<WalletStore>;
}

/**
 * Wallet store mock.
 *
 * Optionally receives a partial WalletStore object to override some mock methods and fields
 */
export const walletStoreMock = async (
  customStore?: Partial<WalletStore>,
  mockPersonalWallet?: Wallet.ObservableWallet
): Promise<WalletStore> => {
  // TODO: update and use `mockPersonalWallet` in test-helpers instead? [LW-5454]
  const wallet = mockPersonalWallet ?? (await Wallet.mockUtils.mockWallet()).wallet;

  // TODO: If possible use real methods/states and mock only needed ones, like inMemoryWallet [LW-5454]
  return {
    fetchNetworkInfo: jest.fn(),
    resetStakePools: jest.fn(),
    fetchStakePools: jest.fn(),
    getWalletActivitiesObservable: jest.fn(),
    fetchingTransactionInfo: false,
    getTransactionDetails: jest.fn(),
    inMemoryWallet: wallet as Wallet.ObservableWallet,
    getKeyAgentType: jest.fn(() => Wallet.KeyManagement.KeyAgentType.InMemory),
    // TODO: mock [LW-5454]
    cardanoWallet: undefined,
    isWalletLocked: jest.fn(() => false),
    networkStateStatus: StateStatus.LOADED,
    resetTransactionState: jest.fn(),
    resetWalletLock: jest.fn(),
    selectedStakePool: undefined,
    setCardanoWallet: jest.fn(),
    setSelectedStakePool: jest.fn(),
    setTransactionDetail: jest.fn(),
    setWalletLock: jest.fn(),
    stakePoolSearchResults: { pageResults: [], totalResultCount: 0 },
    stakePoolSearchResultsStatus: StateStatus.LOADED,
    walletActivitiesStatus: StateStatus.LOADED,
    activitiesCount: 5,
    currentChain: Wallet.Cardano.ChainIds.Preprod,
    setCurrentChain: jest.fn(),
    walletLock: Buffer.from('encrypted-wallet-info'),
    networkInfo: undefined,
    walletActivities: [],
    getAssets: jest.fn(),
    setAssetDetails: jest.fn(),
    walletInfo: mockWalletInfoTestnet,
    keyAgentData: mockKeyAgentDataTestnet,
    setKeyAgentData: jest.fn(),
    setWalletInfo: jest.fn(),
    setCardanoCoin: jest.fn(),
    setNetworkConnection: jest.fn(),
    walletUI: {
      networkConnection: NetworkConnectionStates.CONNNECTED,
      cardanoCoin,
      appMode: APP_MODE_BROWSER,
      areBalancesVisible: true,
      canManageBalancesVisibility: true,
      getHiddenBalancePlaceholder: jest.fn()
    },
    setBalancesVisibility: jest.fn(),
    setWalletManagerUi: jest.fn(),
    walletManagerUi: { wallet, activate: jest.fn() } as unknown as WalletManagerUi,
    blockchainProvider: mockBlockchainProviders(),
    setBlockchainProvider: jest.fn(),
    addressesDiscoveryCompleted: false,
    setAddressesDiscoveryCompleted: jest.fn(),
    ...customStore
  };
};

/**
 * Wallet Store mock
 */
export const MockWalletStore = ({ children, mockStore, customSlice }: StoreProviderProps): React.ReactElement => {
  const mock = () =>
    create<WalletStore>((set, get) =>
      customSlice ? ({ ...mockStore, ...customSlice(set, get) } as WalletStore) : mockStore
    );
  return (
    <StoreProvider appMode={APP_MODE_BROWSER} store={mock()}>
      {children}
    </StoreProvider>
  );
};
