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
import { i18n } from '@lace/translation';
import { I18nextProvider } from 'react-i18next';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual<any>('react-router'),
  useLocation: mockUseLocation
}));

jest.mock('@src/stores', () => ({
  ...jest.requireActual<any>('@src/stores'),
  useWalletStore: mockUseWalletStore
}));

jest.mock('@providers', () => ({
  ...jest.requireActual<any>('@providers'),
  useAnalyticsContext: jest.fn().mockReturnValue({ sendEventToPostHog: jest.fn() })
}));

jest.mock('@cardano-sdk/web-extension', () => ({
  ...jest.requireActual<any>('@cardano-sdk/web-extension'),
  consumeRemoteApi: () => ({
    getDappInfo: jest
      .fn()
      .mockResolvedValueOnce({ logo: 'image', url: 'http://example.com', name: 'test dapp' })
      .mockResolvedValueOnce({ logo: 'image', url: 'https://example.com', name: 'test dapp' })
      .mockResolvedValueOnce({ logo: 'image', url: 'http://example.com', name: 'test dapp' })
      .mockResolvedValueOnce({ logo: 'image', url: 'https://example.com', name: 'test dapp' })
  })
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
      mockUseWalletStore.mockReturnValue({
        environmentName: 'Mainnet'
      });

      render(<WrappedConnectComponent />);

      await waitFor(() => {
        const { getByText } = within(screen.getByTestId('banner-description'));
        expect(getByText('This site is unsecured')).toBeInTheDocument();
        expect(screen.queryByText('Only connect to trusted DApps')).toBeNull();
      });
    });

    test('should render default warning modal for Mainnet env and https protocol', async () => {
      mockUseWalletStore.mockReturnValue({
        environmentName: 'Mainnet'
      });

      render(<WrappedConnectComponent />);

      await waitFor(() => {
        const { getByText } = within(screen.getByTestId('banner-description'));
        expect(getByText('Only connect to trusted DApps')).toBeInTheDocument();
        expect(screen.queryByText('This site is unsecured')).toBeNull();
      });
    });

    test('should render default warning modal for any other than Mainnet env and http protocol', async () => {
      const assert = () => {
        const { getByText } = within(screen.getByTestId('banner-description'));
        expect(getByText('Only connect to trusted DApps')).toBeInTheDocument();
        expect(screen.queryByText('This site is unsecured')).toBeNull();
      };

      mockUseWalletStore.mockReturnValueOnce({
        environmentName: 'Preprod'
      });

      const { rerender } = render(<WrappedConnectComponent />);
      await waitFor(assert);

      mockUseWalletStore.mockReturnValueOnce({
        environmentName: 'Preview'
      });
      rerender(<WrappedConnectComponent />);
      await waitFor(assert);
    });

    test('should render default warning modal for any other than Mainnet env and https protocol', async () => {
      const assert = () => {
        const { getByText } = within(screen.getByTestId('banner-description'));
        expect(getByText('Only connect to trusted DApps')).toBeInTheDocument();
        expect(screen.queryByText('This site is unsecured')).toBeNull();
      };

      mockUseWalletStore.mockReturnValueOnce({
        environmentName: 'Preprod'
      });
      const { rerender } = render(<WrappedConnectComponent />);
      await waitFor(assert);

      mockUseWalletStore.mockReturnValueOnce({
        environmentName: 'Preview'
      });
      rerender(<WrappedConnectComponent />);
      await waitFor(assert);
    });
  });
});
