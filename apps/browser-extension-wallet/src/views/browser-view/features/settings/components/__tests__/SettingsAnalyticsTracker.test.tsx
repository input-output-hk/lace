/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
const mockMatomoSetChain = jest.fn();
const mockMatomoSendEvent = jest.fn();
const mockPostHogSendEvent = jest.fn();
const mockPostHogSetChain = jest.fn();
const mockExtendLifespan = jest.fn();
const mockMakePersisten = jest.fn();
const mockMakeTemporary = jest.fn();
const mockGetBackgroundStorage = jest.fn();
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
  getUserIdService: jest.fn().mockReturnValue({
    extendLifespan: mockExtendLifespan,
    makePersistent: mockMakePersisten,
    makeTemporary: mockMakeTemporary
  })
}));

jest.mock('@providers/AnalyticsProvider/matomo/MatomoClient', () => ({
  ...jest.requireActual<any>('@providers/AnalyticsProvider/matomo/MatomoClient'),
  MatomoClient: jest.fn().mockReturnValue({
    sendEvent: mockMatomoSendEvent,
    setChain: mockMatomoSetChain
  })
}));

jest.mock('@providers/AnalyticsProvider/postHog/PostHogClient', () => ({
  ...jest.requireActual<any>('@providers/AnalyticsProvider/postHog/PostHogClient'),
  PostHogClient: jest.fn().mockReturnValue({
    sendEvent: mockPostHogSendEvent,
    setChain: mockPostHogSetChain
  })
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
  getBackgroundStorage: mockGetBackgroundStorage,
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
  test('should call makePersisten when enabling analytics', async () => {
    const { findByTestId } = render(<SettingsSecurityComponentTest />);

    mockMakePersisten.mockReset();
    mockMakeTemporary.mockReset();

    const analyticsSwitch = await findByTestId('settings-analytics-switch');
    expect(analyticsSwitch).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(analyticsSwitch);
    await waitFor(() => expect(mockMakeTemporary).not.toHaveBeenCalled());
    await waitFor(() => expect(mockMakePersisten).toHaveBeenCalledTimes(1));
  });

  test('should call makeTemporary when disabling analytics', async () => {
    const { findByTestId } = render(<SettingsSecurityComponentTest />);

    mockMakePersisten.mockReset();
    mockMakeTemporary.mockReset();

    const analyticsSwitch = await findByTestId('settings-analytics-switch');
    expect(analyticsSwitch).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(analyticsSwitch);
    await waitFor(() => expect(mockMakePersisten).not.toHaveBeenCalled());
    await waitFor(() => expect(mockMakeTemporary).toHaveBeenCalledTimes(1));
  });
});
