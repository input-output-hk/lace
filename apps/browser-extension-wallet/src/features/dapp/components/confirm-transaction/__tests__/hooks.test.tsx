/* eslint-disable no-magic-numbers */
/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
/* eslint-disable sonarjs/no-identical-functions */

const mockPubDRepKeyToHash = jest.fn();
const mockDisallowSignTx = jest.fn();
const mockEstablishDeviceConnection = jest.fn();
const mockGetTransactionAssetsId = jest.fn();
const mockGetAssetsInformation = jest.fn();
const mockCalculateAssetBalance = jest.fn();
const mockLovelacesToAdaString = jest.fn();
const mockUseWalletStore = jest.fn();
import { act, cleanup } from '@testing-library/react';
import { useCreateAssetList, useGetOwnPubDRepKeyHash, useOnBeforeUnload, useSignWithHardwareWallet } from '../hooks';
import { renderHook } from '@testing-library/react-hooks';
import { Wallet } from '@lace/cardano';
import * as hooks from '@hooks';
import { dAppRoutePaths } from '@routes/wallet-paths';
import { TokenInfo } from '@src/utils/get-assets-information';
import * as Core from '@cardano-sdk/core';
import { TransactionWitnessRequest, WalletType } from '@cardano-sdk/web-extension';

jest.mock('@stores', () => ({
  ...jest.requireActual<any>('@stores'),
  useWalletStore: mockUseWalletStore
}));

jest.mock('@cardano-sdk/core', () => ({
  ...jest.requireActual<any>('@cardano-sdk/core'),
  createTxInspector: jest.fn()
}));

jest.mock('@hooks', () => {
  const original = jest.requireActual('@hooks');
  return {
    __esModule: true,
    ...original
  };
});

jest.mock('@cardano-sdk/hardware-ledger', () => {
  const original = jest.requireActual('@cardano-sdk/hardware-ledger');
  return {
    __esModule: true,
    ...original,
    LedgerKeyAgent: {
      ...original.LedgerKeyAgent,
      establishDeviceConnection: mockEstablishDeviceConnection
    }
  };
});

jest.mock('../utils.ts', () => {
  const original = jest.requireActual('../utils.ts');
  return {
    __esModule: true,
    ...original,
    pubDRepKeyToHash: mockPubDRepKeyToHash,
    disallowSignTx: mockDisallowSignTx
  };
});

jest.mock('@src/stores/slices', () => {
  const original = jest.requireActual('@src/stores/slices');
  return {
    __esModule: true,
    ...original,
    getTransactionAssetsId: mockGetTransactionAssetsId
  };
});

jest.mock('@src/utils/get-assets-information', () => {
  const original = jest.requireActual('@src/utils/get-assets-information');
  return {
    __esModule: true,
    ...original,
    getAssetsInformation: mockGetAssetsInformation
  };
});

jest.mock('@lace/cardano', () => {
  const actual = jest.requireActual<any>('@lace/cardano');
  return {
    __esModule: true,
    ...actual,
    Wallet: {
      ...actual.Wallet,
      util: {
        ...actual.Wallet.util,
        calculateAssetBalance: mockCalculateAssetBalance,
        lovelacesToAdaString: mockLovelacesToAdaString
      }
    }
  };
});

const mockSign = jest.fn().mockImplementation(async () => mockEstablishDeviceConnection());
jest.mock('@providers', () => ({
  ...jest.requireActual<any>('@providers'),
  useViewsFlowContext: () => ({
    signTxRequest: {
      request: {
        sign: mockSign as any,
        requestContext: {} as any,
        reject: jest.fn(),
        signContext: {} as any,
        transaction: {} as any,
        walletType: WalletType.Ledger
      } as TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>
    }
  })
}));

const _listeners: { type: string; listener: EventListenerOrEventListenerObject }[] = [];

const addEventListenerOriginal = window.addEventListener;

const patchAddEventListener = () => {
  window.addEventListener = (type: any, listener: any) => {
    _listeners.push({ type, listener });
    addEventListenerOriginal.call(window, type, listener);
  };
};

const removeEventListeners = () => {
  for (const { type, listener } of _listeners) {
    window.removeEventListener(type, listener);
  }
};

describe('Testing hooks', () => {
  afterEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    cleanup();
  });

  test('useCreateAssetList', async () => {
    const assetsIds = ['id1', 'id2', 'id3', 'id4', 'id5'] as Wallet.Cardano.AssetId[];
    mockGetTransactionAssetsId.mockReset();
    mockGetTransactionAssetsId.mockReturnValue(assetsIds);
    const tokenInfo = new Map([
      [assetsIds[0], null],
      [
        assetsIds[1],
        {
          name: '',
          tokenMetadata: { ticker: `${assetsIds[1]}_tokenMetadata_ticker` },
          nftMetadata: { name: `${assetsIds[1]}_nftMetadata_name` }
        }
      ],
      [
        assetsIds[2],
        {
          name: `${assetsIds[2]}_name`,
          tokenMetadata: { ticker: `${assetsIds[2]}_tokenMetadata_ticker` },
          nftMetadata: { name: `${assetsIds[2]}_nftMetadata_name` }
        }
      ],
      [
        assetsIds[3],
        {
          name: `${assetsIds[3]}_name`,
          tokenMetadata: null,
          nftMetadata: { name: `${assetsIds[3]}_nftMetadata_name` }
        }
      ],
      [
        assetsIds[4],
        {
          name: ''
        }
      ]
    ]) as TokenInfo;
    mockGetAssetsInformation.mockReset();
    mockGetAssetsInformation.mockImplementation(async () => await tokenInfo);
    mockCalculateAssetBalance.mockReset();
    mockCalculateAssetBalance.mockImplementation((value, walletAsset) => `${value}_${walletAsset?.name || 'default'}`);

    const outputs = 'outputs' as unknown as Wallet.Cardano.TxOut[];
    const assetProvider = 'assetProvider' as unknown as Core.AssetProvider;
    const assets = new Map([
      [
        assetsIds[0],
        {
          name: `${assetsIds[0]}_name_from_assets`,
          tokenMetadata: { ticker: `${assetsIds[0]}_tokenMetadata_ticker_from_assets` }
        }
      ],
      [
        assetsIds[1],
        {
          name: `${assetsIds[1]}_name_from_assets`,
          tokenMetadata: null,
          nftMetadata: { name: `${assetsIds[2]}_nftMetadata_name_from_assets` }
        }
      ],
      [assetsIds[2], null],
      [assetsIds[3], null],
      [
        assetsIds[4],
        {
          ...tokenInfo.get(assetsIds[4])
        }
      ]
    ]) as unknown as TokenInfo;

    const tokenMap = new Map(assetsIds.map((id) => [id, `${id}_balance`])) as unknown as Wallet.Cardano.TokenMap;
    tokenMap.set('id5' as Wallet.Cardano.AssetId, 'id5_balance' as unknown as bigint);

    let hook: any;
    await act(async () => {
      hook = renderHook(() => useCreateAssetList({ outputs, assets, assetProvider }));
    });
    expect(hook.result.current(tokenMap)).toEqual([
      // should use assets info
      {
        name: assets.get(assetsIds[0]).name,
        ticker: assets.get(assetsIds[0]).tokenMetadata.ticker,
        amount: `${tokenMap.get(assetsIds[0])}_${assets.get(assetsIds[0]).name}`
      },
      {
        name: assets.get(assetsIds[1]).name,
        ticker: assets.get(assetsIds[1]).nftMetadata.name,
        amount: `${tokenMap.get(assetsIds[1])}_${assets.get(assetsIds[1]).name}`
      },
      // should use assetProvider info
      {
        name: tokenInfo.get(assetsIds[2]).name,
        ticker: tokenInfo.get(assetsIds[2]).tokenMetadata.ticker,
        amount: `${tokenMap.get(assetsIds[2])}_${tokenInfo.get(assetsIds[2]).name}`
      },
      {
        name: tokenInfo.get(assetsIds[3]).name,
        ticker: tokenInfo.get(assetsIds[3]).nftMetadata.name,
        amount: `${tokenMap.get(assetsIds[3])}_${tokenInfo.get(assetsIds[3]).name}`
      },
      {
        name: 'id5',
        amount: `${tokenMap.get('id5' as Wallet.Cardano.AssetId)}_${'default'}`,
        ticker: undefined
      }
    ]);
  });

  test('useSignWithHardwareWallet', async () => {
    const redirectToSignFailure = jest.fn();
    const useRedirectionSpy = jest.spyOn(hooks, 'useRedirection').mockImplementation(() => redirectToSignFailure);
    mockEstablishDeviceConnection.mockReset();
    mockEstablishDeviceConnection.mockImplementation(async () => await true);
    const hook = renderHook(() => useSignWithHardwareWallet());
    await hook.waitFor(() => {
      expect(hook.result.current.isConfirmingTx).toBeFalsy;
      expect(useRedirectionSpy).toHaveBeenLastCalledWith(dAppRoutePaths.dappTxSignSuccess);
    });

    await act(async () => {
      await hook.result.current.signWithHardwareWallet();
    });

    await hook.waitFor(() => {
      expect(hook.result.current.isConfirmingTx).toBe(true);
      expect(mockSign).toHaveBeenCalledTimes(1);
      expect(mockEstablishDeviceConnection).toHaveBeenCalledTimes(1);
      expect(mockDisallowSignTx).not.toHaveBeenCalled();
    });

    mockEstablishDeviceConnection.mockReset();
    mockEstablishDeviceConnection.mockImplementation(async () => {
      throw new Error('error');
    });

    await hook.rerender();

    await act(async () => {
      try {
        await hook.result.current.signWithHardwareWallet();
      } catch {
        expect(hook.result.current.isConfirmingTx).toBe(true);
        expect(mockSign).toHaveBeenCalledTimes(1);
        expect(mockDisallowSignTx).toHaveBeenCalledTimes(1);
        expect(mockDisallowSignTx).toHaveBeenLastCalledWith(false);
        expect(redirectToSignFailure).toHaveBeenCalledTimes(1);
      }
    });
  });

  test('useOnBeforeUnload', async () => {
    patchAddEventListener();
    const cb = jest.fn();
    const hook = renderHook(() => useOnBeforeUnload(cb));

    await hook.waitFor(() => {
      window.dispatchEvent(new Event('beforeunload'));
      expect(cb).toHaveBeenCalledTimes(1);
    });

    hook.unmount();

    window.dispatchEvent(new Event('beforeunload'));
    expect(cb).toHaveBeenCalledTimes(1);

    removeEventListeners();
  });

  test('useGetOwnPubDRepKeyHash', async () => {
    const ed25519PublicKeyHexMock = 'ed25519PublicKeyHexMock';
    mockPubDRepKeyToHash.mockReset();
    mockPubDRepKeyToHash.mockImplementation(async (val: Wallet.Crypto.Ed25519PublicKeyHex) => await val);
    mockUseWalletStore.mockReset();
    mockUseWalletStore.mockReturnValue({
      inMemoryWallet: {
        getPubDRepKey: jest.fn(async () => await ed25519PublicKeyHexMock)
      }
    });

    let hook: any;
    await act(async () => {
      hook = renderHook(() => useGetOwnPubDRepKeyHash());
      expect(hook.result.current.loading).toEqual(true);
    });

    await hook.waitFor(() => {
      expect(hook.result.current.ownPubDRepKeyHash).toEqual(ed25519PublicKeyHexMock);
    });
  });
});
