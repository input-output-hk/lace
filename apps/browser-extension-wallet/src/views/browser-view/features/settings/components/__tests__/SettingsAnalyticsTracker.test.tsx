/* eslint-disable @typescript-eslint/no-explicit-any */
import { userIdServiceMock, matomoClientMocks, postHogClientMocks } from '@src/utils/mocks/test-helpers';
import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { SettingsSecurity } from '../SettingsSecurity';
import { I18nextProvider } from 'react-i18next';
import {
  AnalyticsProvider,
  AppSettingsProvider,
  BackgroundServiceAPIProvider,
  BackgroundServiceAPIProviderProps
} from '@providers';
import i18n from '@lib/i18n';
import { BehaviorSubject } from 'rxjs';

jest.mock('@providers/AnalyticsProvider/getUserIdService', () => ({
  ...jest.requireActual<any>('@providers/AnalyticsProvider/getUserIdService'),
  getUserIdService: jest.fn().mockReturnValue(userIdServiceMock)
}));

jest.mock('@providers/AnalyticsProvider/matomo/MatomoClient', () => ({
  ...jest.requireActual<any>('@providers/AnalyticsProvider/matomo/MatomoClient'),
  MatomoClient: jest.fn().mockReturnValue(matomoClientMocks)
}));

jest.mock('@providers/AnalyticsProvider/postHog/PostHogClient', () => ({
  ...jest.requireActual<any>('@providers/AnalyticsProvider/postHog/PostHogClient'),
  PostHogClient: jest.fn().mockReturnValue(postHogClientMocks)
}));

jest.mock('@stores', () => ({
  ...jest.requireActual<any>('@stores'),
  useWalletStore: jest.fn().mockReturnValue({})
}));

jest.mock('@hooks/useWalletManager', () => ({
  ...jest.requireActual<any>('@hooks/useWalletManager'),
  useWalletManager: jest.fn().mockReturnValue({}),
  useLocalStorage: jest.fn().mockReturnValue([true, { updateLocalStorage: jest.fn() }])
}));

const tokenPrices$ = new BehaviorSubject({});
const adaPrices$ = new BehaviorSubject({});
const backgroundService = {
  getBackgroundStorage: jest.fn(),
  coinPrices: { tokenPrices$, adaPrices$ }
} as unknown as BackgroundServiceAPIProviderProps['value'];

const SettingsSecurityComponentTest = () => (
  <BackgroundServiceAPIProvider value={backgroundService}>
    <AppSettingsProvider>
      <I18nextProvider i18n={i18n}>
        <AnalyticsProvider>
          <SettingsSecurity />
        </AnalyticsProvider>
      </I18nextProvider>
    </AppSettingsProvider>
  </BackgroundServiceAPIProvider>
);

describe('Testing Analytics tracker on SettingsWalletBase component', () => {
  test('should call makePersistent when enabling analytics', async () => {
    const { findByTestId } = render(<SettingsSecurityComponentTest />);

    userIdServiceMock.makePersistent.mockReset();
    userIdServiceMock.makeTemporary.mockReset();

    const analyticsSwitch = await findByTestId('settings-analytics-switch');
    expect(analyticsSwitch).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(analyticsSwitch);
    await waitFor(() => expect(userIdServiceMock.makeTemporary).not.toHaveBeenCalled());
    await waitFor(() => expect(userIdServiceMock.makePersistent).toHaveBeenCalledTimes(1));
  });

  test('should call makeTemporary when disabling analytics', async () => {
    const { findByTestId } = render(<SettingsSecurityComponentTest />);

    userIdServiceMock.makePersistent.mockReset();
    userIdServiceMock.makeTemporary.mockReset();

    const analyticsSwitch = await findByTestId('settings-analytics-switch');
    expect(analyticsSwitch).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(analyticsSwitch);
    await waitFor(() => expect(userIdServiceMock.makePersistent).not.toHaveBeenCalled());
    await waitFor(() => expect(userIdServiceMock.makeTemporary).toHaveBeenCalledTimes(1));
  });
});
