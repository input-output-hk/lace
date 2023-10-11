/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { userIdServiceMock, matomoClientMocks, postHogClientMocks } from '@src/utils/mocks/test-helpers';
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
  MatomoClient: jest.fn().mockReturnValue(matomoClientMocks)
}));

jest.mock('@providers/AnalyticsProvider/getUserIdService', () => ({
  ...jest.requireActual<any>('@providers/AnalyticsProvider/getUserIdService'),
  getUserIdService: jest.fn().mockReturnValue(userIdServiceMock)
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

jest.mock('@providers/ExperimentsProvider', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('@providers/ExperimentsProvider'),
  useExperimentsContext: jest
    .fn()
    .mockReturnValue({ getExperimentVariant: jest.fn(), overrideExperimentVariant: jest.fn() })
}));

jest.mock('@providers/PostHogClientProvider', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('@providers/PostHogClientProvider'),
  usePostHogClientContext: () => postHogClientMocks
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

    await waitFor(() => expect(matomoClientMocks.sendEvent).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(postHogClientMocks.sendEvent).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(userIdServiceMock.extendLifespan).toHaveBeenCalledTimes(2));
  });

  test('should call makePersistent when clicking agree', async () => {
    const { findByTestId } = render(<SetupContainerTest />);

    // since AnalyticsProvider already made a call to setOptedInForEnhancedAnalytics on render, we need to clear the mocks to make the proper test
    userIdServiceMock.makePersistent.mockReset();
    userIdServiceMock.makeTemporary.mockReset();

    const agreeAnalyticsBtn = await findByTestId('wallet-setup-step-btn-next');
    fireEvent.click(agreeAnalyticsBtn);

    await waitFor(() => expect(userIdServiceMock.makePersistent).toHaveBeenCalled());
    await waitFor(() => expect(userIdServiceMock.makeTemporary).not.toHaveBeenCalled());
  });

  test('should call makeTemporary when clicking skip', async () => {
    const { findByTestId } = render(<SetupContainerTest />);

    userIdServiceMock.makePersistent.mockReset();
    userIdServiceMock.makeTemporary.mockReset();

    const skipAnalyticsBtn = await findByTestId('wallet-setup-step-btn-skip');
    fireEvent.click(skipAnalyticsBtn);

    await waitFor(() => expect(userIdServiceMock.makePersistent).not.toHaveBeenCalled());
    await waitFor(() => expect(userIdServiceMock.makeTemporary).toHaveBeenCalledTimes(1));
  });
});
