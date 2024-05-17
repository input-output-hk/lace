/* eslint-disable no-magic-numbers */
import React from 'react';
import '@testing-library/jest-dom';
import { queryByTestId as queryByTestIdInContainer, render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { AssetDetails, AssetDetailsProps } from '../AssetDetails';
import { StateStatus } from '@src/stores/types';
import { i18n } from '@lace/translation';
import * as Stores from '@src/stores';
import { ExternalLinkOpenerProvider } from '@providers';

jest.mock('@src/stores', (): typeof Stores => ({
  ...jest.requireActual<typeof Stores>('@src/stores'),
  useWalletStore: () => ({ walletUI: { getHiddenBalancePlaceholder: jest.fn() } } as unknown as Stores.WalletStore)
}));

const AssetDetailsWrapped = (props: AssetDetailsProps) => (
  <I18nextProvider i18n={i18n}>
    <ExternalLinkOpenerProvider>
      <AssetDetails {...props} />
    </ExternalLinkOpenerProvider>
  </I18nextProvider>
);

describe('AssetDetails', () => {
  test('renders asset amount, fiat price, fiat balance and variation', async () => {
    const { findByTestId } = render(
      <AssetDetailsWrapped
        fiatPrice="5"
        fiatCode="USD"
        balance="200"
        assetSymbol="AST"
        balanceInFiat="1000 USD"
        fiatPriceVariation="0"
        activityList={[]}
      />
    );
    const assetFiatPriceContainer = await findByTestId('token-price');
    const assetBalanceContainer = await findByTestId('token-balance');

    expect(queryByTestIdInContainer(assetFiatPriceContainer, 'portfolio-balance-value')).toHaveTextContent('5');
    expect(queryByTestIdInContainer(assetFiatPriceContainer, 'portfolio-balance-currency')).toHaveTextContent('USD');
    expect(queryByTestIdInContainer(assetFiatPriceContainer, 'portfolio-balance-subtitle')).toHaveTextContent('0%');
    expect(queryByTestIdInContainer(assetBalanceContainer, 'portfolio-balance-value')).toHaveTextContent('200');
    expect(queryByTestIdInContainer(assetBalanceContainer, 'portfolio-balance-currency')).toHaveTextContent('AST');
    expect(queryByTestIdInContainer(assetBalanceContainer, 'portfolio-balance-subtitle')).toHaveTextContent('1000 USD');
  });

  describe('asset activity list', () => {
    test('displays list if is not loading or idle and is not empty', async () => {
      const { queryByTestId, queryAllByTestId } = render(
        <AssetDetailsWrapped
          fiatPrice="5"
          fiatCode="USD"
          balance="200"
          assetSymbol="AST"
          balanceInFiat="1000 USD"
          fiatPriceVariation="0"
          activityList={[
            {
              amount: '100',
              fiatAmount: '450',
              formattedTimestamp: 'Timestamp'
            },
            {
              amount: '200',
              fiatAmount: '400',
              formattedTimestamp: 'Timestamp'
            }
          ]}
        />
      );
      expect(queryByTestId('asset-activity-list')).toBeInTheDocument();
      expect(queryAllByTestId('asset-activity-item')).toHaveLength(2);
    });
    test('does not display list if loading status is loading', async () => {
      const { queryByTestId } = render(
        <AssetDetailsWrapped
          fiatPrice="5"
          fiatCode="USD"
          balance="200"
          assetSymbol="AST"
          balanceInFiat="1000 USD"
          fiatPriceVariation="0"
          activityList={[
            {
              amount: '100',
              fiatAmount: '450',
              formattedTimestamp: 'Timestamp'
            },
            {
              amount: '200',
              fiatAmount: '400',
              formattedTimestamp: 'Timestamp'
            }
          ]}
          activityListStatus={StateStatus.LOADING}
        />
      );
      expect(queryByTestId('asset-activity-list')).not.toBeInTheDocument();
      expect(queryByTestId('asset-activity-item')).not.toBeInTheDocument();
    });
    test('does not display list if loading status is idle', async () => {
      const { queryByTestId } = render(
        <AssetDetailsWrapped
          fiatPrice="5"
          fiatCode="USD"
          balance="200"
          assetSymbol="AST"
          balanceInFiat="1000 USD"
          fiatPriceVariation="0"
          activityList={[
            {
              amount: '100',
              fiatAmount: '450',
              formattedTimestamp: 'Timestamp'
            },
            {
              amount: '200',
              fiatAmount: '400',
              formattedTimestamp: 'Timestamp'
            }
          ]}
          activityListStatus={StateStatus.IDLE}
        />
      );
      expect(queryByTestId('asset-activity-list')).not.toBeInTheDocument();
      expect(queryByTestId('asset-activity-item')).not.toBeInTheDocument();
    });
  });
});
