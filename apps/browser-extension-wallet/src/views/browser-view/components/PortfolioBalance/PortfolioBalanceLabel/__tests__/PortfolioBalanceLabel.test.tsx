import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { PortfolioBalanceLabel, PortfolioBalanceLabelProps } from '../PortfolioBalanceLabel';
import * as Stores from '@src/stores';
import { i18n } from '@lace/translation';

jest.mock('@src/stores', (): typeof Stores => ({
  ...jest.requireActual<typeof Stores>('@src/stores'),
  useWalletStore: () =>
    ({
      setBalancesVisibility: jest.fn(),
      walletUI: { areBalancesVisible: true, canManageBalancesVisibility: true, appMode: 'browser' }
    } as unknown as Stores.WalletStore)
}));

const WrappedPortfolioBalanceLabel = (props: PortfolioBalanceLabelProps) => (
  <I18nextProvider i18n={i18n}>
    <PortfolioBalanceLabel {...props} />
  </I18nextProvider>
);

describe('PortfolioBalanceLabel', () => {
  test('displays text label', () => {
    const { queryByTestId } = render(<WrappedPortfolioBalanceLabel label="Test balance" />);
    expect(queryByTestId('portfolio-balance-label')).toHaveTextContent('Test balance');
  });

  test('displays empty label if not defined', () => {
    const { queryByTestId } = render(<WrappedPortfolioBalanceLabel />);
    expect(queryByTestId('portfolio-balance-label')).toHaveTextContent('');
  });

  test('displays balance visibility toggle if indicated', () => {
    const { queryByTestId } = render(<WrappedPortfolioBalanceLabel showBalanceVisibilityToggle />);
    expect(queryByTestId('closed-eye-icon')).toBeInTheDocument();
  });

  test('does not display balance visibility toggle if not indicated', () => {
    const { queryByTestId } = render(<WrappedPortfolioBalanceLabel label="Test balance" />);
    expect(queryByTestId('closed-eye-icon')).not.toBeInTheDocument();
    expect(queryByTestId('opened-eye-icon')).not.toBeInTheDocument();
  });

  test('displays info tooltip if indicated', () => {
    const { queryByTestId } = render(<WrappedPortfolioBalanceLabel showInfoTooltip />);
    expect(queryByTestId('portfolio-balance-label-info')).toBeInTheDocument();
  });

  test('does not display info tooltip if not indicated', () => {
    const { queryByTestId } = render(<WrappedPortfolioBalanceLabel label="Test balance" />);
    expect(queryByTestId('portfolio-balance-label-info')).not.toBeInTheDocument();
  });
});
