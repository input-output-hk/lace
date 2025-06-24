/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
const useLocationMock = jest.fn();
const mockUseWalletStore = jest.fn();
const mockGetBackgroundStorage = jest.fn();
const mockUseCollateral = jest.fn();
import * as React from 'react';
import { screen, cleanup, render, waitFor, within, fireEvent } from '@testing-library/react';
import { SettingsWallet } from '../SettingsWallet';
import '@testing-library/jest-dom';
import { I18nextProvider } from 'react-i18next';
import { StoreProvider } from '@src/stores';
import { APP_MODE_BROWSER, COLLATERAL_AMOUNT_LOVELACES } from '@src/utils/constants';
import { i18n } from '@lace/translation';
import {
  AnalyticsProvider,
  AppSettingsProvider,
  BackgroundServiceAPIProvider,
  BackgroundServiceAPIProviderProps,
  CurrencyStoreProvider,
  DatabaseProvider,
  ExternalLinkOpenerProvider
} from '@providers';
import { BehaviorSubject } from 'rxjs';
import { act } from 'react-dom/test-utils';
import { BrowserViewSections, MessageTypes } from '@lib/scripts/types';
import * as hooks from '@hooks';
import * as common from '@lace/common';
import { walletRoutePaths } from '@routes';
import { SettingsDrawer } from '../SettingsWalletBase';
import { mockAnalyticsTracker } from '@src/utils/mocks/test-helpers';
import { WalletType } from '@cardano-sdk/web-extension';

const OLD_ENV = process.env;

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const isSettled$ = new BehaviorSubject(true);
const total$ = new BehaviorSubject({ coins: 111 });
const available$ = new BehaviorSubject({ coins: 222 });
const deposit$ = new BehaviorSubject(333);
const rewards$ = new BehaviorSubject(444);
const unspendable$ = new BehaviorSubject({});
const addresses$ = new BehaviorSubject([]);
const tokenPrices$ = new BehaviorSubject({});
const adaPrices$ = new BehaviorSubject({});

const inMemoryWallet = {
  balance: {
    utxo: {
      total$,
      available$,
      unspendable$
    },
    rewardAccounts: {
      deposit$,
      rewards$
    }
  },
  syncStatus: {
    isSettled$
  },
  addresses$
};

const backgroundService = {
  getBackgroundStorage: mockGetBackgroundStorage,
  coinPrices: { tokenPrices$, adaPrices$ }
} as unknown as BackgroundServiceAPIProviderProps['value'];

jest.mock('@hooks', () => {
  const original = jest.requireActual('@hooks');
  return {
    __esModule: true,
    ...original,
    useCollateral: mockUseCollateral
  };
});

jest.mock('@lace/common', () => {
  const original = jest.requireActual('@lace/common');
  return {
    __esModule: true,
    ...original
  };
});

jest.mock('react-router-dom', () => ({
  ...jest.requireActual<any>('react-router'),
  useLocation: useLocationMock
}));

jest.mock('@src/stores', () => ({
  ...jest.requireActual<any>('@src/stores'),
  useWalletStore: mockUseWalletStore
}));

jest.mock('@cardano-sdk/web-extension', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('@cardano-sdk/web-extension'),
  consumeRemoteApi: jest.fn()
}));

jest.mock('@providers/PostHogClientProvider', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('@providers/PostHogClientProvider'),
  usePostHogClientContext: jest.fn()
}));

const testIds = {
  settingsCard: 'settings-card',
  settingLink: 'settings-wallet-collateral-link',
  customDrawer: 'custom-drawer',
  customDrawerTitle: 'drawer-header-title'
};

const getWrapper =
  ({ backgroundService }: { backgroundService?: BackgroundServiceAPIProviderProps['value'] }) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <AppSettingsProvider>
        <DatabaseProvider>
          <StoreProvider appMode={APP_MODE_BROWSER}>
            <I18nextProvider i18n={i18n}>
              <AnalyticsProvider analyticsDisabled tracker={mockAnalyticsTracker as any}>
                <CurrencyStoreProvider>
                  <ExternalLinkOpenerProvider>
                    <BackgroundServiceAPIProvider value={backgroundService}>{children}</BackgroundServiceAPIProvider>
                  </ExternalLinkOpenerProvider>
                </CurrencyStoreProvider>
              </AnalyticsProvider>
            </I18nextProvider>
          </StoreProvider>
        </DatabaseProvider>
      </AppSettingsProvider>
    );

describe('Testing SettingsWalletBase component', () => {
  window.ResizeObserver = ResizeObserver;
  describe('Testing collateral piece', () => {
    beforeEach(() => {
      process.env = { ...OLD_ENV };
      mockUseCollateral.mockReturnValue({
        initializeCollateralTx: jest.fn(),
        submitCollateralTx: jest.fn(),
        isInitializing: false,
        isSubmitting: false,
        hasEnoughAda: true,
        txFee: 0
      });
      useLocationMock.mockReturnValue({ search: '' });
      mockUseWalletStore.mockImplementation(() => ({
        walletType: WalletType.InMemory,
        isInMemoryWallet: true,
        isHardwareWallet: false,
        inMemoryWallet,
        walletUI: {},
        walletInfo: {}
      }));
    });

    afterEach(() => {
      process.env = OLD_ENV;
      jest.resetModules();
      jest.resetAllMocks();
      cleanup();
    });

    test('should render default avail sections for browser mode', async () => {
      process.env.AVAILABLE_CHAINS = 'Mainnet';
      process.env.DEFAULT_CHAIN = 'Mainnet';

      const { queryByTestId } = render(<SettingsWallet />, {
        wrapper: getWrapper({
          backgroundService
        })
      });

      const settingsCard = await queryByTestId(testIds.settingsCard);
      const settingsLinks = await within(settingsCard).getAllByTestId('settings-wallet-', {
        exact: false
      });

      expect(settingsLinks.length).toBe(16);
      expect(settingsLinks[4]).toHaveAttribute('data-testid', 'settings-wallet-general-link');
      expect(settingsLinks[7]).toHaveAttribute('data-testid', 'settings-wallet-collateral-link');
    });

    test('should render all avail sections for browser mode', async () => {
      // show network section
      process.env.AVAILABLE_CHAINS = 'Mainnet,Preprod';
      process.env.DEFAULT_CHAIN = 'Preprod';
      // show dapps section
      process.env.USE_DAPP_CONNECTOR = 'true';
      const { queryByTestId } = render(<SettingsWallet />, {
        wrapper: getWrapper({
          backgroundService
        })
      });

      const settingsCard = await queryByTestId(testIds.settingsCard);
      const settingsLinks = await within(settingsCard).getAllByTestId('settings-wallet-', {
        exact: false
      });

      expect(settingsLinks.length).toBe(22);
      expect(settingsLinks[0]).toHaveAttribute('data-testid', 'settings-wallet-network-link');
      expect(settingsLinks[3]).toHaveAttribute('data-testid', 'settings-wallet-custom-submit-api-link');
      expect(settingsLinks[7]).toHaveAttribute('data-testid', 'settings-wallet-authorized-dapps-link');
      expect(settingsLinks[10]).toHaveAttribute('data-testid', 'settings-wallet-general-link');
      expect(settingsLinks[13]).toHaveAttribute('data-testid', 'settings-wallet-collateral-link');
    });

    test('should render all avail sections for popup mode', async () => {
      // show network section
      process.env.AVAILABLE_CHAINS = 'Mainnet,Preprod';
      process.env.DEFAULT_CHAIN = 'Preprod';
      // show dapps section
      process.env.USE_DAPP_CONNECTOR = 'true';
      const { queryByTestId } = render(<SettingsWallet popupView />, {
        wrapper: getWrapper({
          backgroundService
        })
      });

      const settingsCard = await queryByTestId(testIds.settingsCard);
      const settingsLinks = await within(settingsCard).getAllByTestId('settings-wallet-', {
        exact: false
      });

      expect(settingsLinks.length).toBe(24);
      expect(settingsLinks[0]).toHaveAttribute('data-testid', 'settings-wallet-about-link');
      expect(settingsLinks[3]).toHaveAttribute('data-testid', 'settings-wallet-network-link');
      expect(settingsLinks[6]).toHaveAttribute('data-testid', 'settings-wallet-custom-submit-api-link');
      expect(settingsLinks[10]).toHaveAttribute('data-testid', 'settings-wallet-authorized-dapps-link');
      expect(settingsLinks[13]).toHaveAttribute('data-testid', 'settings-wallet-general-link');
      expect(settingsLinks[16]).toHaveAttribute('data-testid', 'settings-wallet-collateral-link');
    });

    test.todo('should render local node slot');
    test.todo('should render about settings link with proper title and description');
    test.todo('should render network settings link with proper title and description');
    test.todo('should render authorized dapps settings link with proper title and description');
    test.todo('should render general settings link with proper title and description');

    test('should render collateral settings link with proper title and description', async () => {
      const { queryByTestId } = render(<SettingsWallet />, {
        wrapper: getWrapper({
          backgroundService
        })
      });

      const settingsCard = await queryByTestId(testIds.settingsCard);
      const settingsLink = await within(settingsCard).queryByTestId(testIds.settingLink);

      expect(within(settingsLink).getByTestId(`${testIds.settingLink}-title`)).toHaveTextContent('Collateral');
      expect(within(settingsLink).getByTestId(`${testIds.settingLink}-description`)).toHaveTextContent(
        'Add and remove collateral in order to interact with smart contracts on Cardano'
      );
    });

    test('should react to collateral state changes', async () => {
      const { queryByTestId } = render(<SettingsWallet />, {
        wrapper: getWrapper({
          backgroundService
        })
      });

      const settingsCard = await queryByTestId(testIds.settingsCard);

      expect(within(settingsCard).getByTestId(`${testIds.settingLink}-addon`)).toHaveTextContent('Inactive');

      act(() => {
        unspendable$.next({ coins: COLLATERAL_AMOUNT_LOVELACES });
      });

      await waitFor(() => {
        expect(within(settingsCard).getByTestId(`${testIds.settingLink}-addon`)).toHaveTextContent('Active');
      });

      act(() => {
        unspendable$.next({ coins: BigInt(0) });
      });

      await waitFor(() => {
        expect(within(settingsCard).getByTestId(`${testIds.settingLink}-addon`)).toHaveTextContent('Inactive');
      });
    });

    test('should react to collateral state changes and display the drawer', async () => {
      const message = {
        type: MessageTypes.OPEN_COLLATERAL_SETTINGS,
        data: {
          section: BrowserViewSections.COLLATERAL_SETTINGS
        }
      };
      const clearBackgroundStorageMock = jest.fn().mockImplementation(async () => true);
      mockGetBackgroundStorage.mockReturnValue({ message });

      const redirectToSettingsMock = jest.fn();
      const useRedirectionSpy = jest.spyOn(hooks, 'useRedirection').mockImplementation(() => redirectToSettingsMock);

      const useSearchParamsSpy = jest
        .spyOn(common, 'useSearchParams')
        .mockReturnValue({ activeDrawer: SettingsDrawer.collateral });

      render(<SettingsWallet />, {
        wrapper: getWrapper({
          backgroundService: {
            ...backgroundService,
            clearBackgroundStorage: clearBackgroundStorageMock
          }
        })
      });

      await waitFor(() => {
        expect(clearBackgroundStorageMock).toBeCalledWith({ keys: ['message'] });
        expect(useSearchParamsSpy).toBeCalledWith(['activeDrawer']);
        expect(useRedirectionSpy).toBeCalledWith(walletRoutePaths.settings);
        expect(redirectToSettingsMock).toBeCalledWith({ search: { activeDrawer: SettingsDrawer.collateral } });
      });

      await waitFor(() => {
        const customDrawer = screen.getByTestId(testIds.customDrawer);
        expect(customDrawer).toBeInTheDocument();
        expect(within(customDrawer).getByTestId(testIds.customDrawerTitle)).toHaveTextContent('Collateral');
      });

      useSearchParamsSpy.mockReset();
      useRedirectionSpy.mockReset();
    });

    test('should handle on click event for collateral section', async () => {
      const useSearchParamsSpy = jest.spyOn(common, 'useSearchParams').mockReturnValue({});
      const redirectToSettingsMock = jest.fn();
      const useRedirectionSpy = jest.spyOn(hooks, 'useRedirection').mockImplementation(() => redirectToSettingsMock);

      render(<SettingsWallet />, {
        wrapper: getWrapper({ backgroundService })
      });

      expect(screen.queryByTestId(testIds.customDrawer)).toBeNull();
      await act(async () => {
        fireEvent.click(await screen.findByTestId(testIds.settingLink));
      });

      await waitFor(() => {
        expect(redirectToSettingsMock).toBeCalledWith({ search: { activeDrawer: SettingsDrawer.collateral } });
      });

      useSearchParamsSpy.mockReset();
      useRedirectionSpy.mockReset();
    });
  });
});
