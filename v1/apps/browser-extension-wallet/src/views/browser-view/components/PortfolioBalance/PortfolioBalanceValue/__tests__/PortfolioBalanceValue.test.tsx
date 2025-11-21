import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { PortfolioBalanceValue } from '../PortfolioBalanceValue';
import * as Stores from '@src/stores';

jest.mock('@src/stores', (): typeof Stores => ({
  ...jest.requireActual<typeof Stores>('@src/stores'),
  useWalletStore: () =>
    ({ walletUI: { getHiddenBalancePlaceholder: jest.fn().mockReturnValue('***') } } as unknown as Stores.WalletStore)
}));

describe('PortfolioBalanceValue', () => {
  test('displays balance value with currency code and no subtitle', () => {
    const { queryByTestId } = render(<PortfolioBalanceValue balance="10" currencyCode="USD" />);

    expect(queryByTestId('portfolio-balance-value')).toHaveTextContent('10');
    expect(queryByTestId('portfolio-balance-currency')).toHaveTextContent('USD');
    expect(queryByTestId('portfolio-balance-subtitle')).not.toBeInTheDocument();
  });

  test('hides the balance value when it should not be visible but not the subtitle', () => {
    const { queryByTestId } = render(
      <PortfolioBalanceValue
        balance="10"
        currencyCode="ADA"
        isBalanceVisible={false}
        balanceSubtitle={{ value: '10 USD', isPercentage: false }}
      />
    );

    expect(queryByTestId('portfolio-balance-value')).toHaveTextContent('***');
    expect(queryByTestId('portfolio-balance-currency')).not.toBeInTheDocument();
    expect(queryByTestId('portfolio-balance-subtitle')).toHaveTextContent('10 USD');
  });

  describe('displays balance value and subtitle', () => {
    describe('when isPercentage is true', () => {
      test('and value is a positive number', () => {
        const { queryByTestId } = render(
          <PortfolioBalanceValue balance="10" currencyCode="USD" balanceSubtitle={{ value: 0.2, isPercentage: true }} />
        );

        expect(queryByTestId('portfolio-balance-value')).toHaveTextContent('10');
        expect(queryByTestId('portfolio-balance-currency')).toHaveTextContent('USD');
        expect(queryByTestId('portfolio-balance-subtitle')).toHaveTextContent('+0.2%');
      });
      test('and value is a negative number', () => {
        const { queryByTestId } = render(
          <PortfolioBalanceValue
            balance="10"
            currencyCode="USD"
            balanceSubtitle={{ value: -0.2, isPercentage: true }}
          />
        );

        expect(queryByTestId('portfolio-balance-value')).toHaveTextContent('10');
        expect(queryByTestId('portfolio-balance-currency')).toHaveTextContent('USD');
        expect(queryByTestId('portfolio-balance-subtitle')).toHaveTextContent('-0.2%');
      });
      test('and value is a number as a string', () => {
        const { queryByTestId } = render(
          <PortfolioBalanceValue
            balance="10"
            currencyCode="USD"
            balanceSubtitle={{ value: '15', isPercentage: true }}
          />
        );

        expect(queryByTestId('portfolio-balance-value')).toHaveTextContent('10');
        expect(queryByTestId('portfolio-balance-currency')).toHaveTextContent('USD');
        expect(queryByTestId('portfolio-balance-subtitle')).toHaveTextContent('+15%');
      });
      test('and value is a NaN string', () => {
        const { queryByTestId } = render(
          <PortfolioBalanceValue
            balance="10"
            currencyCode="USD"
            balanceSubtitle={{ value: 'Not a Number', isPercentage: true }}
          />
        );

        expect(queryByTestId('portfolio-balance-value')).toHaveTextContent('10');
        expect(queryByTestId('portfolio-balance-currency')).toHaveTextContent('USD');
        expect(queryByTestId('portfolio-balance-subtitle')).toHaveTextContent('Not a Number');
      });
    });

    describe('when isPercentage is false', () => {
      test('and value is a number', () => {
        const { queryByTestId } = render(
          <PortfolioBalanceValue
            balance="10"
            currencyCode="USD"
            balanceSubtitle={{ value: 120, isPercentage: false }}
          />
        );

        expect(queryByTestId('portfolio-balance-value')).toHaveTextContent('10');
        expect(queryByTestId('portfolio-balance-currency')).toHaveTextContent('USD');
        expect(queryByTestId('portfolio-balance-subtitle')).toHaveTextContent('120');
      });

      test('and value is a string', () => {
        const { queryByTestId } = render(
          <PortfolioBalanceValue
            balance="10"
            currencyCode="USD"
            balanceSubtitle={{ value: '120', isPercentage: false }}
          />
        );

        expect(queryByTestId('portfolio-balance-value')).toHaveTextContent('10');
        expect(queryByTestId('portfolio-balance-currency')).toHaveTextContent('USD');
        expect(queryByTestId('portfolio-balance-subtitle')).toHaveTextContent('120');
      });
    });
  });
});
