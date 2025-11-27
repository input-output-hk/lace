/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Wallet } from '@lace/cardano';
import { renderHook, act } from '@testing-library/react-hooks';
import { UISlice } from '../../types';
import '@testing-library/jest-dom';
import { uiSlice } from '../ui-slice';
import create from 'zustand';
import { APP_MODE_POPUP, cardanoCoin, CARDANO_COIN_SYMBOL } from '@src/utils/constants';
import { NetworkConnectionStates, WalletUIProps } from '@src/types';

describe('Testing ui slice', () => {
  let localStorageSetSpy: jest.SpyInstance;
  const props: WalletUIProps = {
    currentChain: Wallet.Cardano.ChainIds.Preprod,
    appMode: APP_MODE_POPUP
  };

  beforeAll(() => {
    localStorageSetSpy = jest.spyOn(Storage.prototype, 'setItem');
  });

  beforeEach(async () => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('should create store hook with ui slice default values', () => {
    const useUiStoreHook = create<UISlice>((set, get) => uiSlice({ set, get }, props));
    const { result } = renderHook(() => useUiStoreHook());

    expect(result.current.walletUI.cardanoCoin).toEqual({
      ...cardanoCoin,
      symbol: CARDANO_COIN_SYMBOL[Wallet.Cardano.NetworkId.Testnet]
    });
    expect(result.current.walletUI.appMode).toEqual(APP_MODE_POPUP);
    expect(result.current.walletUI.areBalancesVisible).toEqual(true);
    expect(result.current.walletUI.canManageBalancesVisibility).toEqual(true);
    expect(result.current.walletUI.networkConnection).toEqual(NetworkConnectionStates.CONNNECTED);
    expect(typeof result.current.setCardanoCoin).toEqual('function');
    expect(typeof result.current.setBalancesVisibility).toEqual('function');
    expect(typeof result.current.setNetworkConnection).toEqual('function');
    expect(typeof result.current.walletUI.getHiddenBalancePlaceholder).toEqual('function');
  });

  describe('Cardano coin', () => {
    test('should set cardano coin symbol depending on network', async () => {
      const useUiStoreHook = create<UISlice>((set, get) => uiSlice({ set, get }, props));
      const { result, waitForNextUpdate } = renderHook(() => useUiStoreHook());

      await act(async () => {
        result.current.setCardanoCoin(Wallet.Cardano.ChainIds.Mainnet);
        await waitForNextUpdate();
        expect(result.current.walletUI.cardanoCoin).toEqual({
          ...cardanoCoin,
          symbol: CARDANO_COIN_SYMBOL[Wallet.Cardano.NetworkId.Mainnet]
        });
      });
    });
  });

  describe('Balance visibility', () => {
    test('should change balance visibility state and update storage', async () => {
      const useUiStoreHook = create<UISlice>((set, get) => uiSlice({ set, get }, props));
      const { result } = renderHook(() => useUiStoreHook());
      expect(result.current.walletUI.areBalancesVisible).toEqual(true);
      act(() => {
        result.current.setBalancesVisibility(false);
      });
      expect(result.current.walletUI.areBalancesVisible).toEqual(false);
      expect(localStorageSetSpy).toHaveBeenCalledWith('hideBalance', 'true');
    });

    test('should return hidden balance placeholder with default and custom length', async () => {
      const useUiStoreHook = create<UISlice>((set, get) => uiSlice({ set, get }, props));
      const { result } = renderHook(() => useUiStoreHook());

      expect(result.current.walletUI.getHiddenBalancePlaceholder()).toEqual('********');
      expect(result.current.walletUI.getHiddenBalancePlaceholder(5)).toEqual('*****');
      expect(result.current.walletUI.getHiddenBalancePlaceholder(10)).toEqual('**********');
    });

    test('should return hidden balance placeholder with default and custom placeholder character', async () => {
      const useUiStoreHook = create<UISlice>((set, get) => uiSlice({ set, get }, props));
      const { result } = renderHook(() => useUiStoreHook());

      expect(result.current.walletUI.getHiddenBalancePlaceholder(undefined, '?')).toEqual('????????');
      expect(result.current.walletUI.getHiddenBalancePlaceholder(5, '_')).toEqual('_____');
    });
  });
});
