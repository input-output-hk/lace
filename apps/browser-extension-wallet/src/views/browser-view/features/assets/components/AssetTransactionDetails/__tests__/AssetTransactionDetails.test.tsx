const mockUseFetchCoinPrice = jest.fn().mockReturnValue({ priceResult: { cardano: { price: 2 }, tokens: new Map() } });
const mockUseWalletStore = jest.fn().mockReturnValue({ transactionDetail: {} } as Stores.WalletStore);
/* eslint-disable import/imports-first */
import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { AssetTransactionDetails } from '../AssetTransactionDetails';
import { APP_MODE_BROWSER } from '@src/utils/constants';
import * as UseFetchCoinPrice from '@hooks/useFetchCoinPrice';
import * as Stores from '@stores';
import * as ActivityComponents from '@views/browser/features/activity';

jest.mock('@views/browser/features/activity', (): typeof ActivityComponents => ({
  ...jest.requireActual<typeof ActivityComponents>('@views/browser/features/activity'),
  TransactionDetail: () => <div data-testid="transaction-detail-mock" />
}));
jest.mock('@hooks/useFetchCoinPrice', (): typeof UseFetchCoinPrice => ({
  ...jest.requireActual<typeof UseFetchCoinPrice>('@hooks/useFetchCoinPrice'),
  useFetchCoinPrice: mockUseFetchCoinPrice
}));
jest.mock('@stores', (): typeof Stores => ({
  ...jest.requireActual<typeof Stores>('@stores'),
  useWalletStore: mockUseWalletStore
}));

describe('AssetTransactionDetails', () => {
  const afterVisibleChangeMock = jest.fn();
  const onBackMock = jest.fn();
  const onCloseMock = jest.fn();

  test('renders transaction detail drawer if visible and price result and transaction detail are defined', () => {
    const { queryByTestId } = render(
      <AssetTransactionDetails
        appMode={APP_MODE_BROWSER}
        afterVisibleChange={afterVisibleChangeMock}
        onBack={onBackMock}
        onClose={onCloseMock}
        isVisible
      />
    );
    expect(queryByTestId('custom-drawer')).toBeInTheDocument();
    expect(queryByTestId('transaction-detail-mock')).toBeInTheDocument();
  });

  test('does not render transaction detail component if price result is not available', () => {
    mockUseFetchCoinPrice.mockReturnValueOnce({});

    const { queryByTestId } = render(
      <AssetTransactionDetails
        appMode={APP_MODE_BROWSER}
        afterVisibleChange={afterVisibleChangeMock}
        onBack={onBackMock}
        onClose={onCloseMock}
        isVisible
      />
    );
    expect(queryByTestId('transaction-detail-mock')).not.toBeInTheDocument();
  });

  test('does not render transaction detail component if transaction detail from store is not available', () => {
    mockUseWalletStore.mockReturnValueOnce({});

    const { queryByTestId } = render(
      <AssetTransactionDetails
        appMode={APP_MODE_BROWSER}
        afterVisibleChange={afterVisibleChangeMock}
        onBack={onBackMock}
        onClose={onCloseMock}
        isVisible
      />
    );
    expect(queryByTestId('transaction-detail-mock')).not.toBeInTheDocument();
  });

  test('does not render the transaction detail drawer if not visible', () => {
    const { queryByTestId } = render(
      <AssetTransactionDetails
        appMode={APP_MODE_BROWSER}
        afterVisibleChange={afterVisibleChangeMock}
        onBack={onBackMock}
        onClose={onCloseMock}
      />
    );
    expect(queryByTestId('custom-drawer')).not.toBeInTheDocument();
    expect(queryByTestId('transaction-detail-mock')).not.toBeInTheDocument();
  });
});
