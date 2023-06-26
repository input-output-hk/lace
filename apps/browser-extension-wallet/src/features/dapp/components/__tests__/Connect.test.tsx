/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable unicorn/consistent-function-scoping */
/* eslint-disable import/imports-first */
const mockUseWalletStore = jest.fn();
const mockUseLocation = jest.fn();
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import '@testing-library/jest-dom';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { Connect } from '../Connect';
import i18n from '@lib/i18n';
import { I18nextProvider } from 'react-i18next';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual<any>('react-router'),
  useLocation: mockUseLocation
}));

jest.mock('@src/stores', () => ({
  ...jest.requireActual<any>('@src/stores'),
  useWalletStore: mockUseWalletStore
}));

const WrappedConnectComponent = () => (
  <I18nextProvider i18n={i18n}>
    <Connect />
  </I18nextProvider>
);

describe('Connect Component: ', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });
  describe('Testing warning modals', () => {
    test('should render non ssl warning modal', async () => {
      const protocol = 'http';
      mockUseWalletStore.mockReturnValue({
        environmentName: 'Mainnet'
      });
      mockUseLocation.mockReturnValue({
        search: `?url=${protocol}://www.bbc.com`
      });

      render(<WrappedConnectComponent />);

      await waitFor(() => {
        const { getByText } = within(screen.getByTestId('banner-description'));
        expect(getByText('This site is unsecured')).toBeInTheDocument();
        expect(screen.queryByText('Only connect to trusted DApps')).toBeNull();
      });
    });

    test('should render default warning modal for Mainnet env and https protocol', async () => {
      const protocol = 'https';
      mockUseWalletStore.mockReturnValue({
        environmentName: 'Mainnet'
      });
      mockUseLocation.mockReturnValue({
        search: `?url=${protocol}://www.bbc.com`
      });

      render(<WrappedConnectComponent />);

      await waitFor(() => {
        const { getByText } = within(screen.getByTestId('banner-description'));
        expect(getByText('Only connect to trusted DApps')).toBeInTheDocument();
        expect(screen.queryByText('This site is unsecured')).toBeNull();
      });
    });

    test('should render default warning modal for any other than Mainnet env and http protocol', async () => {
      const protocol = 'http';
      const assert = () => {
        const { getByText } = within(screen.getByTestId('banner-description'));
        expect(getByText('Only connect to trusted DApps')).toBeInTheDocument();
        expect(screen.queryByText('This site is unsecured')).toBeNull();
      };

      mockUseWalletStore.mockReturnValueOnce({
        environmentName: 'Preprod'
      });
      mockUseLocation.mockReturnValue({
        search: `?url=${protocol}://www.bbc.com`
      });

      const { rerender } = render(<WrappedConnectComponent />);
      await waitFor(assert);

      mockUseWalletStore.mockReturnValueOnce({
        environmentName: 'Preview'
      });
      rerender(<WrappedConnectComponent />);
      await waitFor(assert);

      mockUseWalletStore.mockReturnValueOnce({
        environmentName: 'LegacyTestnet'
      });
      rerender(<WrappedConnectComponent />);
      await waitFor(assert);
    });

    test('should render default warning modal for any other than Mainnet env and https protocol', async () => {
      const protocol = 'https';
      const assert = () => {
        const { getByText } = within(screen.getByTestId('banner-description'));
        expect(getByText('Only connect to trusted DApps')).toBeInTheDocument();
        expect(screen.queryByText('This site is unsecured')).toBeNull();
      };

      mockUseWalletStore.mockReturnValueOnce({
        environmentName: 'Preprod'
      });
      mockUseLocation.mockReturnValue({
        search: `?url=${protocol}://www.bbc.com`
      });

      const { rerender } = render(<WrappedConnectComponent />);
      await waitFor(assert);

      mockUseWalletStore.mockReturnValueOnce({
        environmentName: 'Preview'
      });
      rerender(<WrappedConnectComponent />);
      await waitFor(assert);

      mockUseWalletStore.mockReturnValueOnce({
        environmentName: 'LegacyTestnet'
      });
      rerender(<WrappedConnectComponent />);
      await waitFor(assert);
    });
  });
});
