/* eslint-disable no-magic-numbers */
/* eslint-disable import/imports-first */
/* eslint-disable @typescript-eslint/no-explicit-any */
const mockMatomoSetChain = jest.fn();
const mockMatomoSendEvent = jest.fn();
const mockPostHogSendEvent = jest.fn();
const mockPostHogSetChain = jest.fn();
const mockExtendLifespan = jest.fn();
const mockMakePersisten = jest.fn();
const mockMakeTemporary = jest.fn();
import '@testing-library/jest-dom';
import React from 'react';
import i18n from '@lib/i18n';
import { AnalyticsProvider } from '@providers/AnalyticsProvider/context';
import { ExternalLinkOpenerProvider } from '@providers/ExternalLinkOpenerProvider';
import { ThemeProvider } from '@providers/ThemeProvider';
import { MemoryRouter } from 'react-router-dom';
import { WalletSetup } from '../WalletSetup';
import { I18nextProvider } from 'react-i18next';
import { WalletSetupSteps } from '@lace/core';
import { render, fireEvent, waitFor } from '@testing-library/react';

jest.mock('@stores', () => ({
  ...jest.requireActual<any>('@stores'),
  useWalletStore: jest.fn().mockReturnValue({})
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

jest.mock('@providers/AnalyticsProvider/getUserIdService', () => ({
  ...jest.requireActual<any>('@providers/AnalyticsProvider/getUserIdService'),
  getUserIdService: jest.fn().mockReturnValue({
    extendLifespan: mockExtendLifespan,
    makePersistent: mockMakePersisten,
    makeTemporary: mockMakeTemporary
  })
}));

jest.mock('@hooks', () => ({
  ...jest.requireActual<any>('@hooks'),
  useWalletManager: jest.fn().mockReturnValue({})
}));

jest.mock('react-router-dom', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('react-router-dom'),
  useRouteMatch: jest.fn().mockReturnValue({ path: '/setup' })
}));

const SetupContainerTest = () => (
  <MemoryRouter initialEntries={['/setup/create']}>
    <I18nextProvider i18n={i18n}>
      <AnalyticsProvider>
        <ExternalLinkOpenerProvider>
          <ThemeProvider>
            <WalletSetup initialStep={WalletSetupSteps.Analytics} />
          </ThemeProvider>
        </ExternalLinkOpenerProvider>
      </AnalyticsProvider>
    </I18nextProvider>
  </MemoryRouter>
);

describe('Testing Analytics Agreement step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should call send event for matamo and posthog', async () => {
    const { findByTestId } = render(<SetupContainerTest />);
    const nextAnalyticsAccept = await findByTestId('wallet-setup-step-btn-next');
    fireEvent.click(nextAnalyticsAccept);

    await waitFor(() => expect(mockMatomoSendEvent).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockPostHogSendEvent).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockExtendLifespan).toHaveBeenCalledTimes(2)); // this is being called twice, once per tracker, is this correct?
  });

  test('should call makePersisten when clicking agree', async () => {
    const { findByTestId } = render(<SetupContainerTest />);

    // since AnalyticsProvider already made a call to setOptedInForEnhancedAnalytics on render, we need to clear the mocks to make the proper test
    mockMakePersisten.mockClear();
    mockMakeTemporary.mockClear();

    const agreeAnalyticsBtn = await findByTestId('wallet-setup-step-btn-next');
    fireEvent.click(agreeAnalyticsBtn);

    await waitFor(() => expect(mockMakePersisten).toHaveBeenCalled());
    await waitFor(() => expect(mockMakeTemporary).not.toHaveBeenCalled());
  });

  test('should call makeTemporary when clicking skip', async () => {
    const { findByTestId } = render(<SetupContainerTest />);

    mockMakePersisten.mockClear();
    mockMakeTemporary.mockClear();

    const skipAnalyticsBtn = await findByTestId('wallet-setup-step-btn-skip');
    fireEvent.click(skipAnalyticsBtn);

    await waitFor(() => expect(mockMakePersisten).not.toHaveBeenCalled());
    await waitFor(() => expect(mockMakeTemporary).toHaveBeenCalledTimes(1));
  });
});
