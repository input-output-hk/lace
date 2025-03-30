import React from 'react';
import create, { GetState, SetState } from 'zustand';
import { Wallet } from '@lace/cardano';
import { mockWalletInfoTestnet } from './test-helpers';
import { APP_MODE_BROWSER, cardanoCoin } from '@utils/constants';
import { StateStatus, WalletStore } from '@stores/types';
import { StoreProvider } from '@stores';
import { NetworkConnectionStates } from '@src/types';
import { mockBlockchainProviders } from './blockchain-providers';
import { AddressesDiscoveryStatus } from '@lib/communication/addresses-discoverer';
import { WalletManager, WalletType } from '@cardano-sdk/web-extension';

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
    bitcoinWallet: undefined,
    isBitcoinWallet: false,
    setIsBitcoinWallet: jest.fn(),
    setIsDropdownMenuOpen: jest.fn(),
    setManageAccountsWallet: jest.fn(),
    manageAccountsWallet: undefined,
    walletState: undefined,
    setWalletState: jest.fn(),
    fetchNetworkInfo: jest.fn(),
    resetStakePools: jest.fn(),
    fetchStakePools: jest.fn(),
    getWalletActivities: jest.fn(),
    fetchingActivityInfo: false,
    getActivityDetail: jest.fn(),
    inMemoryWallet: wallet as Wallet.ObservableWallet,
    walletType: WalletType.InMemory,
    isInMemoryWallet: true,
    isHardwareWallet: false,
    isSharedWallet: false,
    // TODO: mock [LW-5454]
    cardanoWallet: undefined,
    isNamiWallet: undefined,
    isWalletLocked: jest.fn(() => false),
    networkStateStatus: StateStatus.LOADED,
    resetActivityState: jest.fn(),
    resetWalletLock: jest.fn(),
    selectedStakePool: undefined,
    setCardanoWallet: jest.fn(),
    setSelectedStakePool: jest.fn(),
    setRewardsActivityDetail: jest.fn(),
    setTransactionActivityDetail: jest.fn(),
    setWalletLock: jest.fn(),
    setStayOnAllDonePage: jest.fn(),
    stayOnAllDonePage: false,
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
    setWalletInfo: jest.fn(),
    setCardanoCoin: jest.fn(),
    setNetworkConnection: jest.fn(),
    walletUI: {
      isDropdownMenuOpen: false,
      networkConnection: NetworkConnectionStates.CONNNECTED,
      cardanoCoin,
      appMode: APP_MODE_BROWSER,
      areBalancesVisible: true,
      canManageBalancesVisibility: true,
      getHiddenBalancePlaceholder: jest.fn()
    },
    setBalancesVisibility: jest.fn(),
    walletManager: { wallet, activate: jest.fn() } as unknown as WalletManager<
      Wallet.WalletMetadata,
      Wallet.AccountMetadata
    >,
    blockchainProvider: mockBlockchainProviders(),
    bitcoinBlockchainProvider: {
      getLastKnownBlock: jest.fn(),
      getTransaction: jest.fn(),
      getTransactions: jest.fn(),
      getTransactionsInMempool: jest.fn(),
      getUTxOs: jest.fn(),
      submitTransaction: jest.fn(),
      getTransactionStatus: jest.fn(),
      estimateFee: jest.fn()
    },
    setBitcoinBlockchainProvider: jest.fn(),
    setBlockchainProvider: jest.fn(),
    initialHdDiscoveryCompleted: false,
    setAddressesDiscoveryCompleted: jest.fn(),
    setDeletingWallet: jest.fn(),
    hdDiscoveryStatus: AddressesDiscoveryStatus.Idle,
    setHdDiscoveryStatus: jest.fn(),
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
