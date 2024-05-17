/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
const mockUseStakePoolDetails = jest.fn();
const mockUseWalletStore = jest.fn();
/* eslint-disable sonarjs/no-duplicate-string */
import * as React from 'react';
import { render, fireEvent, waitFor, screen, within } from '@testing-library/react';
import { StakingModals } from '../StakingModals';
import '@testing-library/jest-dom';

import { I18nextProvider } from 'react-i18next';
import { i18n } from '../../../../../../../lib/i18n';
import { AnalyticsProvider, AppSettingsProvider, ThemeProvider } from '@providers';
import { StoreProvider } from '@src/stores';
import { APP_MODE_BROWSER } from '@src/utils/constants';
import { DrawerUIContainer } from '@src/views/browser-view/components/Drawer';
import { BehaviorSubject } from 'rxjs';
import { postHogClientMocks } from '@src/utils/mocks/test-helpers';

jest.mock('../../../store', () => ({
  ...jest.requireActual<any>('../../../store'),
  useStakePoolDetails: mockUseStakePoolDetails
}));

const handles$ = new BehaviorSubject([]);

const inMemoryWallet = {
  handles$
};
jest.mock('@src/stores', () => ({
  ...jest.requireActual<any>('@src/stores'),
  useWalletStore: mockUseWalletStore
}));

jest.mock('@providers/PostHogClientProvider', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('@providers/PostHogClientProvider'),
  usePostHogClientContext: () => postHogClientMocks
}));

describe('Testing StakingModal component', () => {
  test('should render no funds modal and open receive drawer with proper header, title and subtitle', async () => {
    mockUseWalletStore.mockReturnValue({
      inMemoryWallet
    });
    mockUseStakePoolDetails.mockReturnValue({
      isNoFundsVisible: true,
      setIsDrawerVisible: jest.fn(),
      setNoFundsVisible: () => {
        mockUseStakePoolDetails.mockReset();
        mockUseStakePoolDetails.mockReturnValue({
          isNoFundsVisible: false
        });
      }
    });
    render(
      <AppSettingsProvider>
        <StoreProvider appMode={APP_MODE_BROWSER}>
          <I18nextProvider i18n={i18n}>
            <AnalyticsProvider analyticsDisabled>
              <ThemeProvider>
                <DrawerUIContainer />
              </ThemeProvider>
              <StakingModals />
            </AnalyticsProvider>
          </I18nextProvider>
        </StoreProvider>
      </AppSettingsProvider>
    );

    expect(within(screen.getByTestId('stake-modal-title')).getByText("You don't have enough funds to stake..."));

    fireEvent.click(await screen.findByTestId('no-funds-modal-confirm'));

    await waitFor(async () => {
      expect(screen.queryByText("You don't have enough funds to stake...")).toBeNull();

      const navigation = await within(await screen.getByTestId('drawer-navigation'));
      await waitFor(async () => {
        expect(navigation.getByText('Receive')).toBeInTheDocument();
        expect(within(screen.getByTestId('drawer-header-title')).getByText('Your wallet address')).toBeInTheDocument();
        expect(
          within(screen.getByTestId('drawer-header-subtitle')).getByText('Scan QR code or copy address')
        ).toBeInTheDocument();
      });
    });
  });
});
