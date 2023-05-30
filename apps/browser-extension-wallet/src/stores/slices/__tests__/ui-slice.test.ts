/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Wallet } from '@lace/cardano';
import { renderHook, act } from '@testing-library/react-hooks';
import { UISlice } from '../../types';
import '@testing-library/jest-dom';
import { uiSlice } from '../ui-slice';
import create from 'zustand';
import { APP_MODE_POPUP, cardanoCoin, CARDANO_COIN_SYMBOL } from '@src/utils/constants';

describe('Testing ui slice', () => {
  test('should create store hook with ui slice', () => {
    const props = { currentChain: Wallet.Cardano.ChainIds.Preprod, appMode: APP_MODE_POPUP };
    const useLockHook = create<UISlice>((set, get) => uiSlice({ set, get }, props));
    const { result } = renderHook(() => useLockHook());

    expect(result.current.walletUI.cardanoCoin).toEqual({
      ...cardanoCoin,
      symbol: CARDANO_COIN_SYMBOL[Wallet.Cardano.NetworkId.Testnet]
    });
    expect(result.current.walletUI.appMode).toEqual(APP_MODE_POPUP);
    expect(typeof result.current.setCardanoCoin).toEqual('function');
  });

  test('should set wallet locked info', async () => {
    const props = { currentChain: Wallet.Cardano.ChainIds.Preprod, appMode: APP_MODE_POPUP };
    const useLockHook = create<UISlice>((set, get) => uiSlice({ set, get }, props));
    const { result, waitForNextUpdate } = renderHook(() => useLockHook());

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
