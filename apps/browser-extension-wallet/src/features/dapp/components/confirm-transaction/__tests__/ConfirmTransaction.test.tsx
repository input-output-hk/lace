/* eslint-disable max-statements */
/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
/* eslint-disable no-magic-numbers */
const mockGetKeyAgentType = jest.fn();
const mockUseWalletStore = jest.fn();
const mockExposeApi = jest.fn(() => ({ shutdown: jest.fn() }));
const mockConfirmTransactionContent = jest.fn(() => <span data-testid="ConfirmTransactionContent" />);
const mockUseDisallowSignTx = jest.fn();
const mockUseViewsFlowContext = jest.fn();
const mockUseSignWithHardwareWallet = jest.fn();
const mockUseOnBeforeUnload = jest.fn();
const mockUseComputeTxCollateral = jest.fn().mockReturnValue(BigInt(1_000_000));
const mockCreateTxInspector = jest.fn().mockReturnValue(() => ({ minted: [] as any, burned: [] as any }));
import * as React from 'react';
import { cleanup, render, act, fireEvent } from '@testing-library/react';
import { ConfirmTransaction } from '../ConfirmTransaction';
import '@testing-library/jest-dom';
import { BehaviorSubject } from 'rxjs';
import { Wallet } from '@lace/cardano';
import { getWrapper } from '../testing.utils';
import * as UseComputeTxCollateral from '@hooks/useComputeTxCollateral';

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
  },
  delegation: {
    rewardAccounts$: new BehaviorSubject([])
  },
  addresses$: new BehaviorSubject([])
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
    exposeApi: mockExposeApi
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

jest.mock('../utils.ts', () => {
  const original = jest.requireActual('../utils.ts');
  return {
    __esModule: true,
    ...original
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

jest.mock('@hooks/useComputeTxCollateral', (): typeof UseComputeTxCollateral => ({
  ...jest.requireActual<typeof UseComputeTxCollateral>('@hooks/useComputeTxCollateral'),
  useComputeTxCollateral: mockUseComputeTxCollateral
}));

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

describe('Testing ConfirmTransaction component', () => {
  window.ResizeObserver = ResizeObserver;

  beforeEach(() => {
    mockUseSignWithHardwareWallet.mockReset();
    mockUseSignWithHardwareWallet.mockReturnValue({});
    mockUseViewsFlowContext.mockReset();
    mockUseViewsFlowContext.mockReturnValue({
      utils: {},
      signTxRequest: {
        request: {
          transaction: {
            toCore: jest.fn().mockReturnValue({ id: 'test-tx-id' }),
            getId: jest.fn().mockReturnValue({ id: 'test-tx-id' })
          }
        }
      }
    });
    mockConfirmTransactionContent.mockReset();
    mockConfirmTransactionContent.mockImplementation(() => <span data-testid="ConfirmTransactionContent" />);
  });

  afterEach(() => {
    cleanup();
  });

  test('Should render proper state for inMemory wallet', async () => {
    let queryByTestId: any;

    mockGetKeyAgentType.mockReset();
    mockGetKeyAgentType.mockReturnValue(Wallet.KeyManagement.KeyAgentType.InMemory);
    mockUseWalletStore.mockReset();
    mockUseWalletStore.mockImplementation(() => ({
      getKeyAgentType: mockGetKeyAgentType,
      inMemoryWallet,
      walletUI: {},
      walletInfo: {
        addresses: []
      },
      blockchainProvider: { assetProvider }
    }));

    const signTxData = { tx: { id: 'test-tx-id' } };
    const disallowSignTx = jest.fn();
    mockUseDisallowSignTx.mockReset();
    mockUseDisallowSignTx.mockReturnValue(disallowSignTx);
    const setNextViewMock = jest.fn();
    mockUseViewsFlowContext.mockReset();
    mockUseViewsFlowContext.mockReturnValue({
      utils: { setNextView: setNextViewMock },
      signTxRequest: {
        request: {
          transaction: {
            getId: jest.fn().mockReturnValue({ id: 'test-tx-id' }),
            toCore: jest.fn().mockReturnValue(signTxData.tx)
          }
        }
      }
    });

    await act(async () => {
      ({ queryByTestId } = render(<ConfirmTransaction />, {
        wrapper: getWrapper()
      }));
    });

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
      isHardwareWallet: true,
      walletType: 'Ledger',
      walletUI: {},
      walletInfo: {
        addresses: []
      },
      blockchainProvider: { assetProvider }
    }));

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
});
