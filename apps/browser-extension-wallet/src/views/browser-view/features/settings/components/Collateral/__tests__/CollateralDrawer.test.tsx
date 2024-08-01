/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
const mockUseWalletStore = jest.fn();
const mockGetBackgroundStorage = jest.fn();
const mockUseCollateral = jest.fn();
const mockUseSections = jest.fn();
const clearBuiltTxData = jest.fn();
const setBuiltTxData = jest.fn();
const mockUseBuitTxState = jest.fn();
const mockUseSyncingTheFirstTime = jest.fn();
const setSection = jest.fn();
const mockUseRedirection = jest.fn();
const mockNotify = jest.fn();
const mockUseAnalyticsSendFlowTriggerPoint = jest.fn();
const mockUseOutputs = jest.fn();
const mockGetUserIdService = jest.fn();
const mockUseMetadata = jest.fn();
import * as React from 'react';
import { screen, cleanup, fireEvent, render, within, waitFor } from '@testing-library/react';
import { CollateralDrawer } from '../CollateralDrawer';
import '@testing-library/jest-dom';
import { I18nextProvider } from 'react-i18next';
import { StoreProvider, WalletStore } from '@src/stores';
import { APP_MODE_BROWSER } from '@src/utils/constants';
import { i18n } from '@lace/translation';
import {
  AnalyticsProvider,
  AppSettingsProvider,
  BackgroundServiceAPIProvider,
  BackgroundServiceAPIProviderProps,
  CurrencyStoreProvider,
  DatabaseProvider
} from '@providers';
import { BehaviorSubject } from 'rxjs';
import * as sendTx from '@src/views/browser-view/features/send-transaction';
import { Sections } from '../types';
import { BrowserViewSections, MessageTypes } from '@lib/scripts/types';
import { act } from 'react-dom/test-utils';
import { walletRoutePaths } from '@routes';
import { mockAnalyticsTracker, postHogClientMocks } from '@src/utils/mocks/test-helpers';
import { PostHogClientProvider } from '@providers/PostHogClientProvider';
import { WalletType } from '@cardano-sdk/web-extension';

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const txHash = 'e6eb1c8c806ae7f4d9fe148e9c23853607ffba692ef0a464688911ad3374a932';

const tokenPrices$ = new BehaviorSubject({});
const adaPrices$ = new BehaviorSubject({});
const assetInfo$ = new BehaviorSubject({});

const backgroundService = {
  getBackgroundStorage: mockGetBackgroundStorage,
  coinPrices: { tokenPrices$, adaPrices$ }
} as unknown as BackgroundServiceAPIProviderProps['value'];

jest.mock('@hooks', () => {
  const original = jest.requireActual('@hooks');
  return {
    __esModule: true,
    ...original,
    useCollateral: mockUseCollateral,
    useSyncingTheFirstTime: mockUseSyncingTheFirstTime,
    useRedirection: mockUseRedirection,
    useSharedWalletData: () => ({ getSignPolicy: () => {} })
  };
});

jest.mock('@src/views/browser-view/features/send-transaction', () => {
  const original = jest.requireActual('@src/views/browser-view/features/send-transaction');
  return {
    __esModule: true,
    ...original,
    useBuiltTxState: mockUseBuitTxState,
    useAnalyticsSendFlowTriggerPoint: mockUseAnalyticsSendFlowTriggerPoint,
    useOutputs: mockUseOutputs,
    useMetadata: mockUseMetadata
  };
});

jest.mock('@src/stores', () => ({
  ...jest.requireActual<any>('@src/stores'),
  useWalletStore: mockUseWalletStore
}));

jest.mock('../store', () => ({
  ...jest.requireActual<any>('../store'),
  useSections: mockUseSections
}));

jest.mock('@lace/common', () => {
  const original = jest.requireActual('@lace/common');
  return {
    __esModule: true,
    ...original,
    toast: {
      notify: mockNotify
    }
  };
});

jest.mock('@providers/AnalyticsProvider/getUserIdService', () => ({
  ...jest.requireActual<any>('@providers/AnalyticsProvider/getUserIdService'),
  getUserIdService: mockGetUserIdService
}));

const testIds = {
  collateralSend: 'collateral-send',
  collateralPassword: 'collateral-password',
  collateralConfirmBtn: 'collateral-confirmation-btn',
  btnLoaderContainer: 'btn-loader-container',
  transactionSuccessContainer: 'transaction-success-container',
  transactionHash: 'transaction-hash',
  transactionHashCopyText: 'transaction-hash-copy-text',
  collateralTxCancelBtn: 'collateral-tx-cancel-btn',
  collateralTxNextBtn: 'collateral-tx-next-btn',
  transactionFailContainer: 'tx-fail-container'
};

const getWrapper =
  ({ backgroundService }: { backgroundService?: BackgroundServiceAPIProviderProps['value'] }) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <AppSettingsProvider>
        <DatabaseProvider>
          <StoreProvider appMode={APP_MODE_BROWSER}>
            <I18nextProvider i18n={i18n}>
              <CurrencyStoreProvider>
                <BackgroundServiceAPIProvider value={backgroundService}>
                  <PostHogClientProvider postHogCustomClient={postHogClientMocks as any}>
                    <AnalyticsProvider analyticsDisabled tracker={mockAnalyticsTracker as any}>
                      {children}
                    </AnalyticsProvider>
                  </PostHogClientProvider>
                </BackgroundServiceAPIProvider>
              </CurrencyStoreProvider>
            </I18nextProvider>
          </StoreProvider>
        </DatabaseProvider>
      </AppSettingsProvider>
    );

describe('Testing CollateralDrawer component', () => {
  window.ResizeObserver = ResizeObserver;
  const initializeCollateralTx = jest.fn();
  const submitCollateralTx = jest.fn();
  const useCollateral = {
    initializeCollateralTx,
    submitCollateralTx,
    isInitializing: false,
    isSubmitting: false,
    hasEnoughAda: true,
    txFee: 0
  };
  let walletStore: WalletStore;
  beforeEach(() => {
    mockUseBuitTxState.mockReturnValue({
      clearBuiltTxData,
      setBuiltTxData,
      builtTxData: {} as unknown as sendTx.BuiltTxData
    });
    mockUseAnalyticsSendFlowTriggerPoint.mockReturnValue({ triggerPoint: '', setTriggerPoint: jest.fn() });
    mockUseOutputs.mockReturnValue({ uiOutputs: {} });
    mockUseCollateral.mockReturnValue(useCollateral);
    walletStore = {
      walletType: WalletType.InMemory,
      isInMemoryWallet: true,
      isHardwareWallet: false,
      walletUI: {} as WalletStore['walletUI'],
      inMemoryWallet: { assetInfo$ } as unknown as WalletStore['inMemoryWallet']
    } as WalletStore;
    mockUseWalletStore.mockImplementation(() => walletStore);
    mockUseSections.mockReturnValue({
      setSection,
      currentSection: {}
    });
    mockUseMetadata.mockReturnValue([]);
  });

  afterEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    cleanup();
  });

  test.todo('add tests to match ui states (copies, btn states etc for each step)');

  test('should clear build tx data and initialize collateral tx taking into account "visible" prop value', async () => {
    mockUseSections.mockReturnValue({
      setSection: jest.fn(),
      currentSection: {}
    });
    const { rerender } = render(
      <CollateralDrawer visible={false} unspendableLoaded={false} onClose={jest.fn()} sendAnalyticsEvent={jest.fn()} />,
      {
        wrapper: getWrapper({
          backgroundService
        })
      }
    );

    expect(clearBuiltTxData).toBeCalledTimes(0);
    expect(initializeCollateralTx).toBeCalledTimes(0);

    rerender(
      <CollateralDrawer visible={false} unspendableLoaded={false} onClose={jest.fn()} sendAnalyticsEvent={jest.fn()} />
    );

    expect(clearBuiltTxData).toBeCalledTimes(0);
    expect(initializeCollateralTx).toBeCalledTimes(0);

    rerender(<CollateralDrawer visible unspendableLoaded={false} onClose={jest.fn()} sendAnalyticsEvent={jest.fn()} />);

    expect(clearBuiltTxData).toBeCalledTimes(1);
    expect(initializeCollateralTx).toBeCalledTimes(1);

    rerender(<CollateralDrawer visible unspendableLoaded={false} onClose={jest.fn()} sendAnalyticsEvent={jest.fn()} />);

    expect(clearBuiltTxData).toBeCalledTimes(1);
    expect(initializeCollateralTx).toBeCalledTimes(1);
  });

  test('should set RECLAIM as current step by default', async () => {
    const setSection = jest.fn();
    mockUseSections.mockReturnValue({
      setSection,
      currentSection: {}
    });
    const { rerender } = render(
      <CollateralDrawer visible={false} unspendableLoaded={false} onClose={jest.fn()} sendAnalyticsEvent={jest.fn()} />,
      {
        wrapper: getWrapper({
          backgroundService
        })
      }
    );

    expect(setSection).toHaveBeenLastCalledWith({ currentSection: Sections.RECLAIM });
    expect(initializeCollateralTx).toBeCalledTimes(0);

    rerender(<CollateralDrawer visible unspendableLoaded={false} onClose={jest.fn()} sendAnalyticsEvent={jest.fn()} />);

    expect(setSection).toHaveBeenLastCalledWith({ currentSection: Sections.RECLAIM });
  });

  test('should set RECLAIM as current step for in memory wallet', async () => {
    render(
      <CollateralDrawer visible={false} unspendableLoaded={false} onClose={jest.fn()} sendAnalyticsEvent={jest.fn()} />,
      {
        wrapper: getWrapper({
          backgroundService
        })
      }
    );
    expect(setSection).toBeCalledTimes(1);
    expect(setSection).toHaveBeenLastCalledWith({ currentSection: Sections.RECLAIM });
  });

  test('should set RECLAIM as current section for in memory wallet when wallet is syncing for the first time or unspendable are not loaded', async () => {
    mockUseSyncingTheFirstTime.mockReset();
    mockUseSyncingTheFirstTime.mockReturnValue(true);
    const { rerender } = render(
      <CollateralDrawer visible={false} unspendableLoaded onClose={jest.fn()} sendAnalyticsEvent={jest.fn()} />,
      {
        wrapper: getWrapper({
          backgroundService
        })
      }
    );

    expect(setSection).toBeCalledTimes(1);
    expect(setSection).toHaveBeenLastCalledWith({ currentSection: Sections.RECLAIM });

    mockUseSyncingTheFirstTime.mockReset();
    mockUseSyncingTheFirstTime.mockReturnValue(false);
    rerender(<CollateralDrawer visible unspendableLoaded={false} onClose={jest.fn()} sendAnalyticsEvent={jest.fn()} />);
    expect(setSection).toBeCalledTimes(1);
    expect(setSection).toHaveBeenLastCalledWith({ currentSection: Sections.RECLAIM });
  });

  test('should switch between RECLAIM and SEND for in memory wallet when wallet is not syncing for the first time and unspendable are loaded', async () => {
    mockUseSyncingTheFirstTime.mockReset();
    mockUseSyncingTheFirstTime.mockReturnValue(false);
    const { rerender } = render(
      <CollateralDrawer
        hasCollateral
        visible={false}
        unspendableLoaded
        onClose={jest.fn()}
        sendAnalyticsEvent={jest.fn()}
      />,
      {
        wrapper: getWrapper({
          backgroundService
        })
      }
    );

    expect(setSection).toBeCalledTimes(2);
    expect(setSection).toHaveBeenLastCalledWith({ currentSection: Sections.RECLAIM });

    mockUseSyncingTheFirstTime.mockReset();
    mockUseSyncingTheFirstTime.mockReturnValue(false);
    rerender(
      <CollateralDrawer
        visible
        hasCollateral={false}
        unspendableLoaded
        onClose={jest.fn()}
        sendAnalyticsEvent={jest.fn()}
      />
    );

    expect(setSection).toBeCalledTimes(3);
    expect(setSection).toHaveBeenLastCalledWith({ currentSection: Sections.SEND });
  });

  test.each([WalletType.Ledger, WalletType.Trezor])(
    'should switch to SEND for %s HW wallet when wallet is not syncing for the first time and unspendable are loaded when currrent section is RECLAIM but there are no collaterals',
    async (walletType) => {
      mockUseSyncingTheFirstTime.mockReset();
      mockUseSyncingTheFirstTime.mockReturnValue(false);
      walletStore.walletType = walletType;
      walletStore.isHardwareWallet = true;
      walletStore.isInMemoryWallet = false;
      mockUseSections.mockReset();
      mockUseSections.mockReturnValue({
        setSection,
        currentSection: { currentSection: Sections.RECLAIM }
      });
      const { rerender } = render(
        <CollateralDrawer
          hasCollateral={false}
          visible
          unspendableLoaded
          onClose={jest.fn()}
          sendAnalyticsEvent={jest.fn()}
        />,
        {
          wrapper: getWrapper({
            backgroundService
          })
        }
      );

      expect(setSection).toBeCalledTimes(2);
      expect(setSection.mock.calls[0][0]).toEqual({ currentSection: Sections.RECLAIM });
      expect(setSection).toHaveBeenLastCalledWith({ currentSection: Sections.SEND });

      rerender(
        <CollateralDrawer visible hasCollateral unspendableLoaded onClose={jest.fn()} sendAnalyticsEvent={jest.fn()} />
      );

      expect(setSection).toBeCalledTimes(2);
    }
  );

  test.each([WalletType.Ledger, WalletType.Trezor])(
    'should switch to SUCCESS_TX for %s HW wallet when there is build tx',
    async (walletType) => {
      walletStore.walletType = walletType;
      walletStore.isHardwareWallet = true;
      walletStore.isInMemoryWallet = false;
      mockUseBuitTxState.mockReset();
      mockUseBuitTxState.mockReturnValue({
        clearBuiltTxData,
        builtTxData: {
          uiTx: { hash: txHash }
        } as unknown as sendTx.BuiltTxData
      });
      const { rerender } = render(
        <CollateralDrawer
          hasCollateral={false}
          visible
          unspendableLoaded
          onClose={jest.fn()}
          sendAnalyticsEvent={jest.fn()}
        />,
        {
          wrapper: getWrapper({
            backgroundService
          })
        }
      );

      expect(setSection).toBeCalledTimes(2);
      expect(setSection.mock.calls[0][0]).toEqual({ currentSection: Sections.RECLAIM });
      expect(setSection).toHaveBeenLastCalledWith({ currentSection: Sections.SUCCESS_TX });

      rerender(
        <CollateralDrawer visible hasCollateral unspendableLoaded onClose={jest.fn()} sendAnalyticsEvent={jest.fn()} />
      );

      expect(setSection).toBeCalledTimes(2);
    }
  );

  test.todo('add in memory wallet flows');

  describe('testing reclaim flow', () => {
    test('should handle reclaim functionality', async () => {
      const onClose = jest.fn();
      mockUseSections.mockReset();
      mockUseSections.mockReturnValue({
        setSection,
        currentSection: { currentSection: Sections.RECLAIM }
      });

      const setUnspendable = jest.fn();
      mockUseWalletStore.mockReset();
      mockUseWalletStore.mockImplementation(() => ({
        walletType: WalletType.InMemory,
        walletUI: {},
        inMemoryWallet: {
          utxo: {
            setUnspendable
          }
        }
      }));

      render(
        <CollateralDrawer hasCollateral visible unspendableLoaded onClose={onClose} sendAnalyticsEvent={jest.fn()} />,
        {
          wrapper: getWrapper({
            backgroundService
          })
        }
      );

      const sendConfirmBtn = screen.queryByTestId(testIds.collateralConfirmBtn);
      expect(sendConfirmBtn).toHaveTextContent('Reclaim collateral');

      setSection.mockReset();
      await act(async () => {
        fireEvent.click(sendConfirmBtn);
      });

      expect(setUnspendable).toBeCalled();
      expect(mockNotify).toBeCalled();
      expect(setSection).toBeCalledWith({ currentSection: Sections.SEND });
      expect(onClose).toBeCalled();
    });

    test.todo('add general elements tests for reclaim step');
  });

  describe.each([WalletType.Ledger, WalletType.Trezor])('testing hw flows for %s key agent', (walletType) => {
    beforeEach(() => {
      mockUseSections.mockReset();
      mockUseSections.mockReturnValue({
        setSection,
        currentSection: { currentSection: Sections.SEND }
      });
      walletStore.walletType = walletType;
      walletStore.isHardwareWallet = true;
      walletStore.isInMemoryWallet = false;
      mockUseBuitTxState.mockReset();
      mockUseBuitTxState.mockReturnValue({
        setBuiltTxData,
        clearBuiltTxData,
        builtTxData: {
          uiTx: { hash: txHash }
        } as unknown as sendTx.BuiltTxData
      });
    });

    afterEach(() => {
      jest.resetModules();
      jest.resetAllMocks();
      cleanup();
    });

    test('should handle confirm button disabled when isInitializing is true', async () => {
      mockUseCollateral.mockReset();
      mockUseCollateral.mockReturnValue({
        ...useCollateral,
        isInitializing: true,
        isSubmitting: false
      });

      render(
        <CollateralDrawer
          hasCollateral={false}
          visible
          unspendableLoaded
          onClose={jest.fn()}
          sendAnalyticsEvent={jest.fn()}
        />,
        {
          wrapper: getWrapper({
            backgroundService
          })
        }
      );

      const sendSection = screen.queryByTestId(testIds.collateralSend);
      expect(sendSection).toBeInTheDocument();
      const sendConfirmBtn = screen.queryByTestId(testIds.collateralConfirmBtn);
      expect(screen.queryByTestId(testIds.collateralPassword)).toBeNull();
      expect(sendConfirmBtn).toHaveTextContent(`Confirm transaction with ${walletType}`);
      expect(sendConfirmBtn.closest('button')).toHaveAttribute('disabled');
      expect(within(sendConfirmBtn).queryByTestId(testIds.btnLoaderContainer)).toBeInTheDocument();
      act(() => {
        fireEvent.click(sendConfirmBtn);
      });

      await waitFor(() => {
        expect(submitCollateralTx).toBeCalledTimes(0);
      });
    });

    test('should make confirm button disabled when isSubmitting is true', async () => {
      mockUseCollateral.mockReset();
      mockUseCollateral.mockReturnValue({
        ...useCollateral,
        isInitializing: false,
        isSubmitting: true
      });

      render(
        <CollateralDrawer
          hasCollateral={false}
          visible
          unspendableLoaded
          onClose={jest.fn()}
          sendAnalyticsEvent={jest.fn()}
        />,
        {
          wrapper: getWrapper({
            backgroundService
          })
        }
      );

      const sendConfirmBtn = screen.queryByTestId(testIds.collateralConfirmBtn);
      expect(sendConfirmBtn.closest('button')).toHaveAttribute('disabled');
      expect(within(sendConfirmBtn).queryByTestId(testIds.btnLoaderContainer)).toBeInTheDocument();
      act(() => {
        fireEvent.click(sendConfirmBtn);
      });
      await waitFor(() => {
        expect(submitCollateralTx).toBeCalledTimes(0);
      });
    });

    test('should submit collateral tx and redirect to SUCCESS_TX section', async () => {
      mockUseCollateral.mockReset();
      mockUseCollateral.mockReturnValue({
        ...useCollateral,
        isInitializing: false,
        isSubmitting: false
      });

      mockUseCollateral.mockReset();
      mockUseCollateral.mockReturnValue(useCollateral);

      render(
        <CollateralDrawer
          hasCollateral={false}
          visible
          unspendableLoaded
          onClose={jest.fn()}
          sendAnalyticsEvent={jest.fn()}
        />,
        {
          wrapper: getWrapper({
            backgroundService
          })
        }
      );
      const sendConfirmBtn = screen.queryByTestId(testIds.collateralConfirmBtn);
      act(() => {
        fireEvent.click(sendConfirmBtn);
      });
      await waitFor(() => {
        expect(submitCollateralTx).toBeCalledTimes(1);
        expect(setSection).toHaveBeenLastCalledWith({ currentSection: Sections.SUCCESS_TX });
      });
    });

    describe('testing SUCCESS_TX section', () => {
      const original = window.location;
      beforeAll(() => {
        Object.defineProperty(window, 'location', {
          configurable: true,
          value: { reload: jest.fn() }
        });
      });

      beforeEach(() => {
        walletStore.walletType = WalletType.Ledger;
        walletStore.isInMemoryWallet = false;
        walletStore.isHardwareWallet = true;
        mockUseSections.mockReset();
        mockUseSections.mockReturnValue({
          setSection,
          currentSection: { currentSection: Sections.SUCCESS_TX }
        });
        mockUseBuitTxState.mockReset();
        mockUseBuitTxState.mockReturnValue({
          setBuiltTxData,
          clearBuiltTxData,
          builtTxData: {
            uiTx: { hash: txHash }
          } as unknown as sendTx.BuiltTxData
        });
      });

      afterAll(() => {
        Object.defineProperty(window, 'location', { configurable: true, value: original });
      });

      afterEach(() => {
        jest.resetModules();
        jest.resetAllMocks();
        cleanup();
      });
      test('should display SUCCESS_TX sections with proper hash', async () => {
        render(
          <CollateralDrawer
            hasCollateral
            visible
            unspendableLoaded
            onClose={jest.fn()}
            sendAnalyticsEvent={jest.fn()}
          />,
          {
            wrapper: getWrapper({
              backgroundService
            })
          }
        );

        const transactionSuccessContainer = screen.queryByTestId(testIds.transactionSuccessContainer);
        expect(transactionSuccessContainer).toBeInTheDocument();
        expect(within(transactionSuccessContainer).queryByTestId(testIds.transactionHash)).toHaveTextContent(txHash);
      });

      test('should handle cancel', async () => {
        const redirectToSettingsMock = jest.fn();
        mockUseRedirection.mockImplementation(() => redirectToSettingsMock);
        mockGetBackgroundStorage.mockReset();
        const message = {
          type: MessageTypes.OPEN_COLLATERAL_SETTINGS,
          data: {
            section: BrowserViewSections.COLLATERAL_SETTINGS
          }
        };
        mockGetBackgroundStorage.mockReturnValue({ message });
        const clearBackgroundStorageMock = jest.fn().mockImplementation(async () => true);

        render(
          <CollateralDrawer
            hasCollateral
            visible
            unspendableLoaded
            onClose={jest.fn()}
            sendAnalyticsEvent={jest.fn()}
          />,
          {
            wrapper: getWrapper({
              backgroundService: {
                ...backgroundService,
                clearBackgroundStorage: clearBackgroundStorageMock
              }
            })
          }
        );

        const cancelBtn = screen.queryByTestId(testIds.collateralTxCancelBtn);
        expect(cancelBtn).toBeInTheDocument();
        expect(cancelBtn).toHaveTextContent('Close');
        act(() => {
          fireEvent.click(cancelBtn);
        });

        await waitFor(() => {
          expect(clearBackgroundStorageMock).toBeCalledWith({ keys: ['message'] });
          expect(mockUseRedirection).toBeCalledWith(walletRoutePaths.settings);
          expect(window.location.reload).toHaveBeenCalled();
          expect(redirectToSettingsMock.mock.invocationCallOrder[0]).toBeLessThan(
            (window.location.reload as jest.Mock).mock.invocationCallOrder[0]
          );
        });
      });

      test('should handle confirm', async () => {
        const redirectToSettingsMock = jest.fn();
        mockUseRedirection.mockImplementation(() => redirectToSettingsMock);
        render(
          <CollateralDrawer
            hasCollateral
            visible
            unspendableLoaded
            onClose={jest.fn()}
            sendAnalyticsEvent={jest.fn()}
          />,
          {
            wrapper: getWrapper({
              backgroundService
            })
          }
        );

        const confirmBtn = screen.queryByTestId(testIds.collateralTxNextBtn);
        expect(confirmBtn).toBeInTheDocument();
        expect(confirmBtn).toHaveTextContent('View transaction');
        expect(mockUseRedirection).toBeCalledWith(walletRoutePaths.activity);

        act(() => {
          fireEvent.click(confirmBtn);
        });

        await waitFor(() => {
          expect(window.location.reload).toHaveBeenCalled();
          expect(redirectToSettingsMock).toBeCalledTimes(1);
          expect(setSection).toHaveBeenLastCalledWith({ currentSection: Sections.RECLAIM });
          expect(setSection.mock.invocationCallOrder[0]).toBeLessThan(
            (window.location.reload as jest.Mock).mock.invocationCallOrder[0]
          );
        });
      });
    });

    describe('testing FAIL_TX section', () => {
      const original = window.location;
      beforeAll(() => {
        Object.defineProperty(window, 'location', {
          configurable: true,
          value: { reload: jest.fn() }
        });
      });

      beforeEach(() => {
        walletStore.walletType = WalletType.Ledger;
        walletStore.isHardwareWallet = true;
        walletStore.isInMemoryWallet = false;
        mockUseSections.mockReset();
        mockUseSections.mockReturnValue({
          setSection,
          currentSection: { currentSection: Sections.FAIL_TX }
        });
        mockUseBuitTxState.mockReset();
        mockUseBuitTxState.mockReturnValue({
          setBuiltTxData,
          clearBuiltTxData,
          builtTxData: {
            uiTx: { hash: txHash }
          } as unknown as sendTx.BuiltTxData
        });
      });

      afterAll(() => {
        Object.defineProperty(window, 'location', { configurable: true, value: original });
      });

      afterEach(() => {
        jest.resetModules();
        jest.resetAllMocks();
        cleanup();
      });
      test('should display FAIL_tx section', async () => {
        render(
          <CollateralDrawer
            hasCollateral
            visible
            unspendableLoaded
            onClose={jest.fn()}
            sendAnalyticsEvent={jest.fn()}
          />,
          {
            wrapper: getWrapper({
              backgroundService
            })
          }
        );

        const failContainer = screen.queryByTestId(testIds.transactionFailContainer);
        expect(failContainer).toBeInTheDocument();
      });

      test('should handle cancel', async () => {
        mockUseRedirection.mockReset();
        const redirectToActivitiesMock = jest.fn();
        const redirectToSettingsMock = jest.fn();
        mockUseRedirection.mockImplementationOnce(() => redirectToActivitiesMock);
        mockUseRedirection.mockImplementation(() => redirectToSettingsMock);
        mockGetBackgroundStorage.mockReset();
        const message = {
          type: MessageTypes.OPEN_COLLATERAL_SETTINGS,
          data: {
            section: BrowserViewSections.COLLATERAL_SETTINGS
          }
        };
        mockGetBackgroundStorage.mockReturnValue({ message });
        const clearBackgroundStorageMock = jest.fn().mockImplementation(async () => true);

        render(<CollateralDrawer hasCollateral visible unspendableLoaded onClose={jest.fn()} />, {
          wrapper: getWrapper({
            backgroundService: {
              ...backgroundService,
              clearBackgroundStorage: clearBackgroundStorageMock
            }
          })
        });

        const cancelBtn = screen.queryByTestId(testIds.collateralTxCancelBtn);
        expect(cancelBtn).toBeInTheDocument();
        expect(cancelBtn).toHaveTextContent('Cancel');
        act(() => {
          fireEvent.click(cancelBtn);
        });

        setSection.mockReset();
        await waitFor(() => {
          expect(clearBackgroundStorageMock).toBeCalledWith({ keys: ['message'] });
          expect(window.location.reload).toHaveBeenCalled();
          expect(setSection).not.toBeCalled();
          expect(redirectToActivitiesMock).not.toBeCalled();
          expect(redirectToSettingsMock.mock.invocationCallOrder[0]).toBeLessThan(
            (window.location.reload as jest.Mock).mock.invocationCallOrder[0]
          );
        });
      });

      test('should handle back', async () => {
        const redirectToSettingsMock = jest.fn();
        mockUseRedirection.mockImplementation(() => redirectToSettingsMock);
        render(
          <CollateralDrawer
            hasCollateral
            visible
            unspendableLoaded
            onClose={jest.fn()}
            sendAnalyticsEvent={jest.fn()}
          />,
          {
            wrapper: getWrapper({
              backgroundService
            })
          }
        );

        const confirmBtn = screen.queryByTestId(testIds.collateralTxNextBtn);
        expect(confirmBtn).toBeInTheDocument();
        expect(confirmBtn).toHaveTextContent('Back');

        act(() => {
          fireEvent.click(confirmBtn);
        });

        await waitFor(() => {
          expect(window.location.reload).toHaveBeenCalled();
          expect(redirectToSettingsMock).not.toHaveBeenCalled();
          expect(setSection).toHaveBeenLastCalledWith({ currentSection: Sections.SEND });
        });
      });
    });
  });
});
