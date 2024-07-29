const mockUseFetchCoinPrice = jest.fn().mockReturnValue({ priceResult: { cardano: { price: 2 }, tokens: new Map() } });
const mockUseAnalyticsContext = jest.fn().mockReturnValue({});
const mockUseCurrencyStore = jest.fn().mockReturnValue({ fiatCurrency: { code: 'usd', symbol: '$' } });
const mockUseRedirection = jest.fn().mockReturnValue([jest.fn]);
const mockUseWalletStore = jest.fn().mockReturnValue({
  walletInfo: {
    addresses: [
      {
        address:
          'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp'
      }
    ]
  },
  walletUI: { canManageBalancesVisibility: jest.fn, areBalancesVisible: true, getHiddenBalancePlaceholder: jest.fn },
  setBalancesVisibility: jest
} as unknown as Stores.WalletStore);
/* eslint-disable no-magic-numbers */
/* eslint-disable import/imports-first */
import React from 'react';
import '@testing-library/jest-dom';
import { IRow } from '@lace/core';
import { render } from '@testing-library/react';
import { APP_MODE_BROWSER, APP_MODE_POPUP } from '@src/utils/constants';
import * as AnalyticsProvider from '@providers/AnalyticsProvider';
import * as CurrencyProvider from '@providers/currency';
import * as UseFetchCoinPrice from '@hooks/useFetchCoinPrice';
import * as UseRedirection from '@hooks/useRedirection';
import * as Stores from '@stores';
import { AssetsPortfolio } from '../AssetsPortfolio';
import * as BrowserComponents from '@src/views/browser-view/components';

jest.mock('@hooks/useFetchCoinPrice', (): typeof UseFetchCoinPrice => ({
  ...jest.requireActual<typeof UseFetchCoinPrice>('@hooks/useFetchCoinPrice'),
  useFetchCoinPrice: mockUseFetchCoinPrice
}));
jest.mock('@hooks/useRedirection', (): typeof UseRedirection => ({
  ...jest.requireActual<typeof UseRedirection>('@hooks/useRedirection'),
  useRedirection: mockUseRedirection
}));
jest.mock('@providers/AnalyticsProvider', (): typeof AnalyticsProvider => ({
  ...jest.requireActual<typeof AnalyticsProvider>('@providers/AnalyticsProvider'),
  useAnalyticsContext: mockUseAnalyticsContext
}));
jest.mock('@providers/currency', (): typeof CurrencyProvider => ({
  ...jest.requireActual<typeof CurrencyProvider>('@providers/currency'),
  useCurrencyStore: mockUseCurrencyStore
}));
jest.mock('@stores', (): typeof Stores => ({
  ...jest.requireActual<typeof Stores>('@stores'),
  useWalletStore: mockUseWalletStore
}));
jest.mock('@src/views/browser-view/components', (): typeof BrowserComponents => ({
  ...jest.requireActual<typeof BrowserComponents>('@src/views/browser-view/components'),
  FundWalletBanner: () => <div data-testid="fund-wallet-banner-mock" />
}));

describe('AssetsPortfolio', () => {
  const onRowClickMock = jest.fn();
  const onTableScrollMock = jest.fn();
  const assetList = [
    { id: 'cardano', variation: '0' },
    { id: 'asset1', variation: '0' }
  ] as IRow[];

  test('renders assets table, portfolio balance and token counter with the correct values', () => {
    const { queryByTestId, queryAllByTestId } = render(
      <AssetsPortfolio
        appMode={APP_MODE_BROWSER}
        assetList={assetList}
        onRowClick={onRowClickMock}
        onTableScroll={onTableScrollMock}
        totalAssets={assetList.length}
        portfolioTotalBalance="300"
      />
    );
    expect(queryByTestId('asset-table')).toBeInTheDocument();
    expect(queryAllByTestId('infinite-scrollable-table-row')).toHaveLength(2);
    expect(queryByTestId('section-title')).toBeInTheDocument();
    expect(queryByTestId('section-title-counter')).toHaveTextContent('(2)');
    expect(queryByTestId('portfolio-balance-value')).toHaveTextContent('300.00');
    expect(queryByTestId('fund-wallet-banner-mock')).not.toBeInTheDocument();
  });

  test('does not render the balance and table if it is loading for the first time', () => {
    const { queryByTestId } = render(
      <AssetsPortfolio
        appMode={APP_MODE_BROWSER}
        assetList={assetList}
        isLoadingFirstTime
        onRowClick={onRowClickMock}
        onTableScroll={onTableScrollMock}
        totalAssets={assetList.length}
        portfolioTotalBalance="300"
      />
    );
    expect(queryByTestId('asset-table')).not.toBeInTheDocument();
    expect(queryByTestId('section-title')).not.toBeInTheDocument();
    expect(queryByTestId('section-title-counter')).not.toBeInTheDocument();
    expect(queryByTestId('portfolio-balance-value')).not.toBeInTheDocument();
    expect(queryByTestId('fund-wallet-banner-mock')).not.toBeInTheDocument();
  });

  test('does not render the portfolio balance and asset table if balance is loading', () => {
    const { queryByTestId } = render(
      <AssetsPortfolio
        appMode={APP_MODE_BROWSER}
        assetList={assetList}
        isBalanceLoading
        onRowClick={onRowClickMock}
        onTableScroll={onTableScrollMock}
        totalAssets={assetList.length}
        portfolioTotalBalance="300"
      />
    );
    expect(queryByTestId('section-title')).toBeInTheDocument();
    expect(queryByTestId('section-title-counter')).toBeInTheDocument();
    expect(queryByTestId('asset-table')).not.toBeInTheDocument();
    expect(queryByTestId('portfolio-balance-value')).not.toBeInTheDocument();
    expect(queryByTestId('fund-wallet-banner-mock')).not.toBeInTheDocument();
  });

  test('renders the no funds banner if wallet has no assets and balance is 0', () => {
    const { queryByTestId } = render(
      <AssetsPortfolio
        appMode={APP_MODE_BROWSER}
        assetList={[]}
        onRowClick={onRowClickMock}
        onTableScroll={onTableScrollMock}
        totalAssets={0}
        portfolioTotalBalance="0"
      />
    );
    expect(queryByTestId('asset-table')).not.toBeInTheDocument();
    expect(queryByTestId('section-title-counter')).toHaveTextContent('(0)');
    expect(queryByTestId('portfolio-balance-value')).toHaveTextContent('0.00');
    expect(queryByTestId('fund-wallet-banner-mock')).toBeInTheDocument();
  });

  test('does not render the asset table or no funds banner if the asset list is loading', () => {
    const { queryByTestId } = render(
      <AssetsPortfolio
        appMode={APP_MODE_BROWSER}
        assetList={undefined}
        onRowClick={onRowClickMock}
        onTableScroll={onTableScrollMock}
        totalAssets={0}
        portfolioTotalBalance="0"
      />
    );
    expect(queryByTestId('asset-table')).not.toBeInTheDocument();
    expect(queryByTestId('section-title-counter')).toHaveTextContent('(0)');
  });

  test('renders send receive component if is in popup view and total assets > 0', () => {
    const { queryByTestId } = render(
      <AssetsPortfolio
        appMode={APP_MODE_POPUP}
        assetList={assetList}
        onRowClick={onRowClickMock}
        onTableScroll={onTableScrollMock}
        totalAssets={assetList.length}
        portfolioTotalBalance="300"
      />
    );
    expect(queryByTestId('send-receive-container')).toBeInTheDocument();
  });
});
