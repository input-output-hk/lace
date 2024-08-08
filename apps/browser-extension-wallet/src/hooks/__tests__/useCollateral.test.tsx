/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-catch-shadow */
/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
const mockUseMaxAda = jest.fn();
const mockUseBuitTxState = jest.fn();
const mockToastNotify = jest.fn();
const mockUseSyncingTheFirstTime = jest.fn();
const mockCreateTxBuilder = jest.fn();
const mockUseWalletStore = jest.fn();
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { cleanup, renderHook } from '@testing-library/react-hooks';
import { AppSettingsProvider } from '@providers';
import { StoreProvider } from '@src/stores';
import { COLLATERAL_ADA_AMOUNT, COLLATERAL_AMOUNT_LOVELACES, useCollateral } from '@hooks';
import { APP_MODE_BROWSER } from '@src/utils/constants';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@lace/translation';
import { Wallet } from '@lace/cardano';
import { act } from 'react-dom/test-utils';
import { waitFor } from '@testing-library/react';
import { TxInspection } from '@cardano-sdk/tx-construction';
import { WitnessedTx } from '@cardano-sdk/key-management';
import { Cardano, HandleResolution, Serialization } from '@cardano-sdk/core';
import { WalletType } from '@cardano-sdk/web-extension';

const txHash = 'e6eb1c8c806ae7f4d9fe148e9c23853607ffba692ef0a464688911ad3374a932';
const address =
  'addr_test1qp9xn9gwdjkj0w300vc8xgctegvgty2ks4n875zdzjkkzy3qz69wq6z9tpmuj9tutsc7f0s4kx6mvh3mwupmjdjx2fjqf0q2j2';
const addresses$ = new BehaviorSubject([{ address }]);
const signedTx = {
  cbor: '' as Serialization.TxCBOR,
  tx: { id: 'txId' } as Cardano.Tx,
  context: {
    handles: [] as HandleResolution[],
    handleResolutions: [] as HandleResolution[]
  }
} as WitnessedTx;
const utxo = [{ txId: signedTx.tx.id }, { value: { coins: COLLATERAL_AMOUNT_LOVELACES } }];
const available$ = new BehaviorSubject([utxo]);

const inMemoryWallet = {
  addresses$,
  createTxBuilder: mockCreateTxBuilder
};

jest.mock('@src/stores', () => ({
  ...jest.requireActual<any>('@src/stores'),
  useWalletStore: mockUseWalletStore
}));

jest.mock('@src/views/browser-view/features/send-transaction', () => {
  const original = jest.requireActual('@src/views/browser-view/features/send-transaction');
  return {
    __esModule: true,
    ...original,
    useBuiltTxState: mockUseBuitTxState
  };
});

jest.mock('@hooks/useMaxAda', () => ({
  ...jest.requireActual<any>('@hooks/useMaxAda'),
  useMaxAda: mockUseMaxAda
}));

jest.mock('@hooks/useSyncingTheFirstTime', () => ({
  ...jest.requireActual<any>('@hooks/useSyncingTheFirstTime'),
  useSyncingTheFirstTime: mockUseSyncingTheFirstTime
}));

jest.mock('@lace/common', () => ({
  ...jest.requireActual<any>('@lace/common'),
  toast: {
    notify: mockToastNotify
  }
}));

const getWrapper =
  () =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <AppSettingsProvider>
        <StoreProvider appMode={APP_MODE_BROWSER}>
          <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
        </StoreProvider>
      </AppSettingsProvider>
    );

describe('Testing useCollateral hook', () => {
  beforeEach(() => {
    mockUseWalletStore.mockReturnValue({ inMemoryWallet });
  });
  afterEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
    cleanup();
  });
  test('should return proper initial states', async () => {
    mockUseBuitTxState.mockReturnValue({});
    mockUseMaxAda.mockReturnValue('');
    const hook = renderHook(() => useCollateral(), { wrapper: getWrapper() });
    await waitFor(() => {
      expect(hook.result.current.isInitializing).toBe(false);
      expect(hook.result.current.isSubmitting).toBe(false);
      expect(typeof hook.result.current.initializeCollateralTx).toBe('function');
      expect(typeof hook.result.current.submitCollateralTx).toBe('function');
      expect(hook.result.current.hasEnoughAda).toBe(false);
      expect(hook.result.current.txFee).toBe(undefined);
    });
    mockUseBuitTxState.mockReset();
  });

  test('should return proper hasEnoughAda value', async () => {
    mockUseBuitTxState.mockReturnValue({});
    mockUseMaxAda.mockReturnValue(BigInt(Wallet.util.adaToLovelacesString(String(COLLATERAL_ADA_AMOUNT + 1))));

    const hook = renderHook(() => useCollateral(), { wrapper: getWrapper() });

    expect(hook.result.current.hasEnoughAda).toBe(true);

    mockUseMaxAda.mockReset();
    mockUseMaxAda.mockReturnValue(BigInt(Wallet.util.adaToLovelacesString(String(COLLATERAL_ADA_AMOUNT - 1))));
    hook.rerender();
    await waitFor(() => {
      expect(hook.result.current.hasEnoughAda).toBe(false);
    });

    mockUseMaxAda.mockReset();
    mockUseMaxAda.mockReturnValue(BigInt(Wallet.util.adaToLovelacesString(String(COLLATERAL_ADA_AMOUNT))));
    hook.rerender();
    await waitFor(() => {
      expect(hook.result.current.hasEnoughAda).toBe(true);
    });
  });

  describe('testing utils', () => {
    const fee = BigInt(1);
    const addOutput = jest.fn();
    const build = jest.fn();
    const inspect = jest.fn();

    const tx = {
      body: { fee },
      inputSelection: {
        fee: 'fee',
        outputs: 'outputs'
      },
      hash: txHash
    } as unknown as TxInspection;
    const sign = jest.fn();
    const mockSubmitTx = jest.fn();
    const mockSetUnspendable = jest.fn();
    const mockSetBuiltTxData = jest.fn();
    beforeEach(() => {
      sign.mockImplementation(async () => await signedTx);
      inspect.mockImplementation(async () => await tx);
      build.mockReturnValue({ inspect, sign });
      const builder = {
        build
      };
      addOutput.mockReturnValue(builder);
      mockCreateTxBuilder.mockReturnValue({
        addOutput
      });
      mockUseBuitTxState.mockReturnValue({
        setBuiltTxData: mockSetBuiltTxData
      });

      mockUseWalletStore.mockReturnValue({
        inMemoryWallet: {
          ...inMemoryWallet,
          createTxBuilder: mockCreateTxBuilder,
          submitTx: mockSubmitTx,
          utxo: {
            setUnspendable: mockSetUnspendable,
            available$
          }
        }
      });
    });

    afterEach(() => {
      jest.resetAllMocks();
      jest.resetModules();
      cleanup();
    });

    describe('testing initializeCollateralTx', () => {
      test('should exit early in case there is not enough ada or the wallet is syncing for the first time', async () => {
        mockUseMaxAda.mockReturnValue(BigInt(Wallet.util.adaToLovelacesString(String(COLLATERAL_ADA_AMOUNT - 1))));
        mockUseSyncingTheFirstTime.mockReturnValue(false);
        const hook = renderHook(() => useCollateral(), { wrapper: getWrapper() });

        await act(async () => {
          await hook.result.current.initializeCollateralTx();
        });
        await waitFor(() => {
          expect(hook.result.current.txFee).toBe(undefined);
          expect(mockCreateTxBuilder).not.toHaveBeenCalled();
          expect(addOutput).not.toHaveBeenCalled();
          expect(build).not.toHaveBeenCalled();
          expect(inspect).not.toHaveBeenCalled();
        });

        mockUseMaxAda.mockReset();
        mockUseMaxAda.mockReturnValue(BigInt(Wallet.util.adaToLovelacesString(String(COLLATERAL_ADA_AMOUNT))));
        mockUseSyncingTheFirstTime.mockReturnValue(true);
        hook.rerender();
        act(() => {
          hook.result.current.initializeCollateralTx();
        });
        await waitFor(() => {
          expect(hook.result.current.txFee).toBe(undefined);
          expect(hook.result.current.txFee).toBe(undefined);
          expect(mockCreateTxBuilder).not.toHaveBeenCalled();
          expect(addOutput).not.toHaveBeenCalled();
          expect(build).not.toHaveBeenCalled();
          expect(inspect).not.toHaveBeenCalled();
        });
      });

      test('should set proper txFee', async () => {
        const output = {
          address: address && Cardano.PaymentAddress(address),
          value: {
            coins: COLLATERAL_AMOUNT_LOVELACES
          }
        };
        mockUseMaxAda.mockReturnValue(BigInt(Wallet.util.adaToLovelacesString(String(COLLATERAL_ADA_AMOUNT + 1))));
        mockUseSyncingTheFirstTime.mockReturnValue(false);
        const hook = renderHook(() => useCollateral(), { wrapper: getWrapper() });
        act(() => {
          hook.result.current.initializeCollateralTx();
        });

        await waitFor(() => {
          expect(hook.result.current.txFee).toBe(fee);
          expect(mockCreateTxBuilder).toHaveBeenCalledTimes(1);
          expect(addOutput).toHaveBeenCalledTimes(1);
          expect(addOutput).toHaveBeenCalledWith(output);
          expect(build).toHaveBeenCalledTimes(1);
          expect(inspect).toHaveBeenCalledTimes(1);
        });
      });
    });
    describe('testing submitCollateralTx', () => {
      test('should exit early in case txBuilder is not set', async () => {
        mockUseMaxAda.mockReturnValue(BigInt(Wallet.util.adaToLovelacesString(String(COLLATERAL_ADA_AMOUNT - 1))));
        mockUseSyncingTheFirstTime.mockReturnValue(false);
        const hook = renderHook(() => useCollateral(), { wrapper: getWrapper() });

        await act(async () => {
          await hook.result.current.initializeCollateralTx();
          await hook.result.current.submitCollateralTx();
        });
        await waitFor(() => {
          expect(build).not.toHaveBeenCalled();
          expect(sign).not.toHaveBeenCalled();
          expect(mockSubmitTx).not.toHaveBeenCalled();
          expect(mockSetUnspendable).not.toHaveBeenCalled();
          expect(inspect).not.toHaveBeenCalled();
          expect(mockSetBuiltTxData).not.toHaveBeenCalled();
          expect(mockToastNotify).not.toHaveBeenCalled();
        });

        mockUseMaxAda.mockReset();
        mockUseMaxAda.mockReturnValue(BigInt(Wallet.util.adaToLovelacesString(String(COLLATERAL_ADA_AMOUNT))));
        mockUseSyncingTheFirstTime.mockReturnValue(true);
        hook.rerender();
        await act(async () => {
          await hook.result.current.initializeCollateralTx();
          await hook.result.current.submitCollateralTx();
        });
        await waitFor(() => {
          expect(build).not.toHaveBeenCalled();
          expect(sign).not.toHaveBeenCalled();
          expect(mockSubmitTx).not.toHaveBeenCalled();
          expect(mockSetUnspendable).not.toHaveBeenCalled();
          expect(inspect).not.toHaveBeenCalled();
          expect(mockSetBuiltTxData).not.toHaveBeenCalled();
          expect(mockToastNotify).not.toHaveBeenCalled();
        });
      });

      test('should submit the tx and set the colateral for inMemory wallet', async () => {
        mockSubmitTx.mockReset();
        mockUseWalletStore.mockReturnValue({
          inMemoryWallet: {
            ...inMemoryWallet,
            createTxBuilder: mockCreateTxBuilder,
            submitTx: mockSubmitTx,
            utxo: {
              setUnspendable: mockSetUnspendable,
              available$
            }
          },
          walletType: WalletType.InMemory,
          isInMemoryWallet: true
        });

        mockUseMaxAda.mockReturnValue(BigInt(Wallet.util.adaToLovelacesString(String(COLLATERAL_ADA_AMOUNT + 1))));
        mockUseSyncingTheFirstTime.mockReturnValue(false);
        const hook = renderHook(() => useCollateral(), { wrapper: getWrapper() });

        await act(async () => {
          await hook.result.current.initializeCollateralTx();
          await hook.result.current.submitCollateralTx();
        });

        await waitFor(() => {
          expect(mockSubmitTx).toBeCalledWith(signedTx);
          expect(mockToastNotify).toBeCalledWith({ text: 'Collateral added' });
          expect(mockSetUnspendable).toBeCalledWith([utxo]);
          expect(mockSetBuiltTxData).not.toBeCalled();
        });
      });

      test('should submit the tx and set the colateral for HW (not in memory wallet)', async () => {
        mockSubmitTx.mockReset();

        mockUseMaxAda.mockReset();
        mockUseMaxAda.mockReturnValue(BigInt(Wallet.util.adaToLovelacesString(String(COLLATERAL_ADA_AMOUNT + 1))));
        mockUseSyncingTheFirstTime.mockReset();
        mockUseSyncingTheFirstTime.mockReturnValue(false);
        const hook = renderHook(() => useCollateral(), { wrapper: getWrapper() });

        await act(async () => {
          await hook.result.current.initializeCollateralTx();
          await hook.result.current.submitCollateralTx();
        });

        await waitFor(() => {
          expect(mockSubmitTx).toBeCalledWith(signedTx);
          expect(mockToastNotify).toBeCalledWith({ text: 'Collateral added' });
          expect(mockSetUnspendable).toBeCalledWith([utxo]);
          expect(mockSetBuiltTxData).toBeCalledWith({
            uiTx: {
              fee: tx.inputSelection.fee,
              hash: tx.hash,
              outputs: tx.inputSelection.outputs
            }
          });
        });
      });

      test.todo('should handle rejections');
    });
  });
});
