/* eslint-disable max-statements */
/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
const mockGetKeyAgentType = jest.fn();
const mockUseWalletStore = jest.fn();
const error = 'error in getSignTxData';
const mockConsumeRemoteApi = jest.fn();
const mockConfirmTransactionContent = jest.fn(() => <span data-testid="ConfirmTransactionContent" />);
const mockGetTitleKey = jest.fn();
const mockGetTxType = jest.fn();
const mockUseDisallowSignTx = jest.fn();
const mockUseViewsFlowContext = jest.fn();
const mockUseSignWithHardwareWallet = jest.fn();
const mockUseOnBeforeUnload = jest.fn();
const mockCreateTxInspector = jest.fn().mockReturnValue(() => ({ minted: [] as any, burned: [] as any }));
import * as React from 'react';
import { cleanup, render, act, fireEvent } from '@testing-library/react';
import { ConfirmTransaction } from '../ConfirmTransaction';
import '@testing-library/jest-dom';
import { I18nextProvider } from 'react-i18next';
import { StoreProvider } from '@src/stores';
import {
  AnalyticsProvider,
  AppSettingsProvider,
  BackgroundServiceAPIProvider,
  BackgroundServiceAPIProviderProps,
  DatabaseProvider,
  ViewFlowProvider
} from '@src/providers';
import { APP_MODE_BROWSER } from '@src/utils/constants';
import i18n from '@lib/i18n';
import { BehaviorSubject } from 'rxjs';
import { sendViewsFlowState } from '../../../config';
import { PostHogClientProvider } from '@providers/PostHogClientProvider';
import { postHogClientMocks } from '@src/utils/mocks/test-helpers';
import { Wallet } from '@lace/cardano';

const assetInfo$ = new BehaviorSubject(new Map());
const available$ = new BehaviorSubject([]);

const assetProvider = {
  getAsset: () => ({}),
  getAssets: (): any[] => []
};
const inMemoryWallet = {
  assetInfo$,
  balance: {
    utxo: {
      available$
    }
  }
};

jest.mock('@src/stores', () => ({
  ...jest.requireActual<any>('@src/stores'),
  useWalletStore: mockUseWalletStore
}));

jest.mock('@stores', () => ({
  ...jest.requireActual<any>('@stores'),
  useWalletStore: mockUseWalletStore
}));

jest.mock('@cardano-sdk/web-extension', () => {
  const original = jest.requireActual('@cardano-sdk/web-extension');
  return {
    __esModule: true,
    ...original,
    consumeRemoteApi: mockConsumeRemoteApi
  };
});

jest.mock('@cardano-sdk/core', () => {
  const original = jest.requireActual('@cardano-sdk/core');
  return {
    __esModule: true,
    ...original,
    createTxInspector: mockCreateTxInspector
  };
});

jest.mock('@lace/common', () => {
  const original = jest.requireActual('@lace/common');
  return {
    __esModule: true,
    ...original,
    useSearchParams: () => ({})
  };
});

jest.mock('../ConfirmTransactionContent', () => {
  const original = jest.requireActual('../ConfirmTransactionContent');
  return {
    __esModule: true,
    ...original,
    ConfirmTransactionContent: mockConfirmTransactionContent
  };
});

jest.mock('../utils.ts', () => {
  const original = jest.requireActual('../utils.ts');
  return {
    __esModule: true,
    ...original,
    getTitleKey: mockGetTitleKey,
    getTxType: mockGetTxType
  };
});

jest.mock('../hooks.ts', () => {
  const original = jest.requireActual('../hooks.ts');
  return {
    __esModule: true,
    ...original,
    useDisallowSignTx: mockUseDisallowSignTx,
    useSignWithHardwareWallet: mockUseSignWithHardwareWallet,
    useOnBeforeUnload: mockUseOnBeforeUnload
  };
});

jest.mock('@providers/ViewFlowProvider', () => {
  const original = jest.requireActual('@providers/ViewFlowProvider');
  return {
    __esModule: true,
    ...original,
    useViewsFlowContext: mockUseViewsFlowContext
  };
});

const testIds = {
  dappTransactionConfirm: 'dapp-transaction-confirm',
  layoutTitle: 'layout-title',
  dappTransactionCancel: 'dapp-transaction-cancel'
};

const backgroundService = {
  getBackgroundStorage: jest.fn(),
  setBackgroundStorage: jest.fn()
} as unknown as BackgroundServiceAPIProviderProps['value'];

const getWrapper =
  () =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <BackgroundServiceAPIProvider value={backgroundService}>
        <AppSettingsProvider>
          <DatabaseProvider>
            <StoreProvider appMode={APP_MODE_BROWSER}>
              <PostHogClientProvider postHogCustomClient={postHogClientMocks as any}>
                <AnalyticsProvider analyticsDisabled>
                  <I18nextProvider i18n={i18n}>
                    <ViewFlowProvider viewStates={sendViewsFlowState}>{children}</ViewFlowProvider>
                  </I18nextProvider>
                </AnalyticsProvider>
              </PostHogClientProvider>
            </StoreProvider>
          </DatabaseProvider>
        </AppSettingsProvider>
      </BackgroundServiceAPIProvider>
    );

describe('Testing ConfirmTransaction component', () => {
  window.ResizeObserver = ResizeObserver;

  beforeEach(() => {
    mockUseSignWithHardwareWallet.mockReset();
    mockUseSignWithHardwareWallet.mockReturnValue({});
    mockUseViewsFlowContext.mockReset();
    mockUseViewsFlowContext.mockReturnValue({ utils: {} });
    mockConfirmTransactionContent.mockReset();
    mockConfirmTransactionContent.mockImplementation(() => <span data-testid="ConfirmTransactionContent" />);
  });

  afterEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    cleanup();
  });

  test('Should render proper state for inMemory wallet', async () => {
    let queryByTestId: any;

    const txType = 'txType';
    mockGetKeyAgentType.mockReset();
    mockGetKeyAgentType.mockReturnValue(Wallet.KeyManagement.KeyAgentType.InMemory);
    mockUseWalletStore.mockReset();
    mockUseWalletStore.mockImplementation(() => ({
      getKeyAgentType: mockGetKeyAgentType,
      inMemoryWallet,
      walletUI: {},
      walletInfo: {},
      blockchainProvider: { assetProvider }
    }));
    mockGetTxType.mockReset();
    mockGetTxType.mockReturnValue(txType);
    mockGetTitleKey.mockReset();
    mockGetTitleKey.mockImplementation((val) => val);

    const signTxData = { tx: { id: 'test-tx-id' } };
    mockConsumeRemoteApi.mockReset();
    mockConsumeRemoteApi.mockReturnValue({
      getSignTxData: async () => await Promise.resolve(signTxData)
    });
    const disallowSignTx = jest.fn();
    mockUseDisallowSignTx.mockReset();
    mockUseDisallowSignTx.mockReturnValue(disallowSignTx);
    const setNextViewMock = jest.fn();
    mockUseViewsFlowContext.mockReset();
    mockUseViewsFlowContext.mockReturnValue({ utils: { setNextView: setNextViewMock } });

    await act(async () => {
      ({ queryByTestId } = render(<ConfirmTransaction />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId(testIds.layoutTitle)).toHaveTextContent(txType);
    expect(queryByTestId('ConfirmTransactionContent')).toBeInTheDocument();
    expect(mockConfirmTransactionContent).toHaveBeenLastCalledWith(
      {
        txType,
        signTxData,
        errorMessage: undefined,
        onError: expect.any(Function)
      },
      {}
    );
    expect(mockUseOnBeforeUnload).toHaveBeenCalledWith(disallowSignTx);
    expect(queryByTestId(testIds.dappTransactionConfirm)).toHaveTextContent('Confirm');
    expect(queryByTestId(testIds.dappTransactionConfirm)).not.toBeDisabled();
    expect(queryByTestId(testIds.dappTransactionCancel)).toHaveTextContent('Cancel');

    await act(async () => {
      fireEvent.click(queryByTestId(testIds.dappTransactionCancel));
    });

    expect(disallowSignTx).toHaveBeenCalledWith(true);

    await act(async () => {
      fireEvent.click(queryByTestId(testIds.dappTransactionConfirm));
    });

    expect(setNextViewMock).toHaveBeenCalled();
  });

  test('Should render proper state for hardware wallet', async () => {
    let queryByTestId: any;

    mockGetKeyAgentType.mockReset();
    mockGetKeyAgentType.mockReturnValue(Wallet.KeyManagement.KeyAgentType.Ledger);
    mockUseWalletStore.mockReset();
    mockUseWalletStore.mockImplementation(() => ({
      getKeyAgentType: mockGetKeyAgentType,
      inMemoryWallet,
      walletUI: {},
      walletInfo: {},
      blockchainProvider: { assetProvider }
    }));

    const signTxData = { tx: { id: 'test-tx-id' } };
    mockConsumeRemoteApi.mockReset();
    mockConsumeRemoteApi.mockReturnValue({
      getSignTxData: async () => await Promise.resolve(signTxData)
    });
    const signWithHardwareWalletMock = jest.fn();
    mockUseSignWithHardwareWallet.mockReset();
    mockUseSignWithHardwareWallet.mockReturnValue({ signWithHardwareWallet: signWithHardwareWalletMock });

    await act(async () => {
      ({ queryByTestId } = render(<ConfirmTransaction />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId(testIds.dappTransactionConfirm)).toHaveTextContent('Confirm with Ledger');

    await act(async () => {
      fireEvent.click(queryByTestId(testIds.dappTransactionConfirm));
    });

    expect(signWithHardwareWalletMock).toHaveBeenCalled();
  });

  test('should disable confirm button and show proper error if getSignTxData throws', async () => {
    let queryByTestId: any;
    const txType = 'txType';
    mockUseWalletStore.mockImplementation(() => ({
      getKeyAgentType: mockGetKeyAgentType,
      inMemoryWallet,
      walletUI: {},
      walletInfo: {},
      blockchainProvider: { assetProvider }
    }));
    mockConsumeRemoteApi.mockReset();
    mockConsumeRemoteApi.mockReturnValue({
      getSignTxData: async () => await Promise.reject(error)
    });
    mockGetTxType.mockReset();
    mockGetTxType.mockReturnValue(txType);
    await act(async () => {
      ({ queryByTestId } = render(<ConfirmTransaction />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('ConfirmTransactionContent')).toBeInTheDocument();
    expect(mockConfirmTransactionContent).toHaveBeenLastCalledWith(
      { errorMessage: error, onError: expect.any(Function), signTxData: undefined, txType: undefined },
      {}
    );
    expect(queryByTestId(testIds.dappTransactionConfirm).closest('button')).toHaveAttribute('disabled');
  });
});
