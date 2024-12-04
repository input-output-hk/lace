/* eslint-disable import/imports-first */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as UseMaxAda from '@hooks/useMaxAda';
import { mockAsset, mockWalletInfoTestnet, postHogClientMocks } from '@src/utils/mocks/test-helpers';
import { cardanoCoin } from '@src/utils/constants';
import { Wallet } from '@lace/cardano';
import { BehaviorSubject } from 'rxjs';
import * as CurrencyProvider from '@providers/currency';

const mockUseOutputs = jest.fn();
const mockGetBackgroundStorage = jest.fn();
const mockUseMaxAda = jest.fn().mockReturnValue(BigInt(100));
const mockUseRewardAccountsData = jest.fn().mockReturnValue({ lockedStakeRewards: 0 });
const mockUseAddressState = jest.fn((_row: string) => ({
  address: '',
  handle: '',
  assets: [{ id: cardanoCoin.id }],
  isHandleVerified: false,
  handleStatus: {
    isVerified: true,
    hasHandleOwnershipChanged: false
  }
}));

const total$ = new BehaviorSubject({ coins: 111 });
const isSettled$ = new BehaviorSubject(true);
const available$ = new BehaviorSubject({ coins: 222 });
const deposit$ = new BehaviorSubject(333);
const rewards$ = new BehaviorSubject(444);
const unspendable$ = new BehaviorSubject({});
const addresses$ = new BehaviorSubject([]);
const tokenPrices$ = new BehaviorSubject({});
const adaPrices$ = new BehaviorSubject({});

const inMemoryWallet = {
  balance: {
    utxo: {
      total$,
      available$,
      unspendable$
    },
    rewardAccounts: {
      deposit$,
      rewards$
    }
  },
  syncStatus: {
    isSettled$
  },
  addresses$
};

const mockWalletStore: Stores.WalletStore = {
  inMemoryWallet,
  walletInfo: mockWalletInfoTestnet,
  currentChain: Wallet.Cardano.ChainIds.Preprod,
  walletUI: { areBalancesVisible: true, canManageBalancesVisibility: true, cardanoCoin }
} as unknown as Stores.WalletStore;

const mockUseWalletStore = jest.fn(() => mockWalletStore);
const mockUseCurrencyStore = jest.fn().mockReturnValue({ fiatCurrency: { code: 'usd', symbol: '$' } });

import React from 'react';
import '@testing-library/jest-dom';
import { PriceResult } from '@hooks';
import * as Stores from '@src/stores';
import { PostHogClientProvider } from '@providers/PostHogClientProvider';
import { act } from 'react-dom/test-utils';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { Form, Props } from '../Form';

import {
  AnalyticsProvider,
  BackgroundServiceAPIProvider,
  BackgroundServiceAPIProviderProps,
  DatabaseProvider
} from '@providers';

jest.mock('@src/stores', (): typeof Stores => ({
  ...jest.requireActual<typeof Stores>('@src/stores'),
  useWalletStore: mockUseWalletStore
}));

jest.mock('@hooks/useMaxAda', (): typeof UseMaxAda => ({
  ...jest.requireActual<typeof UseMaxAda>('@hooks/useMaxAda'),
  useMaxAda: mockUseMaxAda
}));

jest.mock('@providers/currency', (): typeof CurrencyProvider => ({
  ...jest.requireActual<typeof CurrencyProvider>('@providers/currency'),
  useCurrencyStore: mockUseCurrencyStore
}));

jest.mock('@src/views/browser-view/features/staking/hooks', () => ({
  ...jest.requireActual<any>('@src/views/browser-view/features/staking/hooks'),
  useRewardAccountsData: mockUseRewardAccountsData
}));

const setNewOutput = jest.fn();
mockUseOutputs.mockReturnValue({
  setNewOutput,
  ids: ['1'],
  uiOutputs: {
    '1': {
      assets: ['1']
    }
  }
});
jest.mock('../../../store', () => {
  const original = jest.requireActual('../../../store');
  return {
    __esModule: true,
    ...original,
    useOutputs: mockUseOutputs,
    useAddressState: mockUseAddressState
  };
});

const backgroundService = {
  getBackgroundStorage: mockGetBackgroundStorage,
  coinPrices: { tokenPrices$, adaPrices$ }
} as unknown as BackgroundServiceAPIProviderProps['value'];

const getWrapper =
  ({ backgroundService }: { backgroundService?: BackgroundServiceAPIProviderProps['value'] }) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <BackgroundServiceAPIProvider value={backgroundService}>
        <DatabaseProvider>
          <PostHogClientProvider postHogCustomClient={postHogClientMocks as any}>
            <AnalyticsProvider analyticsDisabled>{children}</AnalyticsProvider>
          </PostHogClientProvider>
        </DatabaseProvider>
      </BackgroundServiceAPIProvider>
    );

const mockProps: Props = {
  assets: new Map(),
  coinBalance: '100',
  assetBalances: new Map([[mockAsset.assetId, BigInt(100)]]),
  isLoading: false,
  isPopupView: false,
  prices: {
    tokens: new Map([[mockAsset.assetId, { priceInAda: 10 }]]),
    cardano: { price: 0.5 }
  } as PriceResult
};

describe('Form Integration Tests', () => {
  test('renders Form component correctly', async () => {
    let queryByTestId: any;
    act(() => {
      ({ queryByTestId } = render(<Form {...mockProps} />, {
        wrapper: getWrapper({
          backgroundService
        })
      }));
    });

    await waitFor(async () => {
      expect(queryByTestId('add-bundle-button')).toBeInTheDocument();
    });
  });

  test('handles add bundle button click', async () => {
    window.HTMLElement.prototype.scrollIntoView = () => {};

    let queryByTestId: any;
    act(() => {
      ({ queryByTestId } = render(<Form {...mockProps} />, {
        wrapper: getWrapper({
          backgroundService
        })
      }));
    });

    fireEvent.click(queryByTestId('add-bundle-button'));
    expect(setNewOutput).toHaveBeenCalled();
  });
});
