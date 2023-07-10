/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
const mockGetKeyAgentType = jest.fn();
const mockUseWalletStore = jest.fn();
const error = 'error in getSignTxData';
const mockConsumeRemoteApi = jest.fn().mockReturnValue({
  getSignTxData: async () => await Promise.reject(error)
});
const mockCreateTxInspector = jest.fn().mockReturnValue(() => ({ minted: [] as any, burned: [] as any }));
import * as React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { ConfirmTransaction } from '../ConfirmTransaction';
import '@testing-library/jest-dom';
import { I18nextProvider } from 'react-i18next';
import { StoreProvider } from '@src/stores';
import { AppSettingsProvider, DatabaseProvider, ViewFlowProvider } from '@src/providers';
import { APP_MODE_BROWSER } from '@src/utils/constants';
import i18n from '@lib/i18n';
import { BehaviorSubject } from 'rxjs';
import { act } from 'react-dom/test-utils';
import { sendViewsFlowState } from '../../config';

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

const testIds = {
  dappTransactionConfirm: 'dapp-transaction-confirm'
};

const getWrapper =
  () =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <AppSettingsProvider>
        <DatabaseProvider>
          <StoreProvider appMode={APP_MODE_BROWSER}>
            <I18nextProvider i18n={i18n}>
              <ViewFlowProvider viewStates={sendViewsFlowState}>{children}</ViewFlowProvider>
            </I18nextProvider>
          </StoreProvider>
        </DatabaseProvider>
      </AppSettingsProvider>
    );

describe('Testing ConfirmTransaction component', () => {
  window.ResizeObserver = ResizeObserver;
  describe('Testing errors', () => {
    beforeEach(() => {
      mockUseWalletStore.mockImplementation(() => ({
        getKeyAgentType: mockGetKeyAgentType,
        inMemoryWallet,
        walletUI: {},
        walletInfo: {},
        blockchainProvider: { assetProvider }
      }));
    });

    afterEach(() => {
      jest.resetModules();
      jest.resetAllMocks();
      cleanup();
    });

    test('should disable confirm button and show proper error if getSignTxData throws', async () => {
      let queryByTestId: any;
      act(() => {
        ({ queryByTestId } = render(<ConfirmTransaction />, {
          wrapper: getWrapper()
        }));
      });

      await waitFor(async () => {
        expect(queryByTestId(testIds.dappTransactionConfirm).closest('button')).toHaveAttribute('disabled');
      });
    });
  });
});
