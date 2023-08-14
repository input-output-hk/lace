/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom';
import { Wallet } from '@lace/cardano';
import create, { GetState, SetState, UseStore } from 'zustand';
import { act, renderHook } from '@testing-library/react-hooks';
import { BlockchainProviderSlice, WalletInfoSlice } from '@stores/types';
import { walletInfoSlice } from '../wallet-info-slice';
import {
  mockPersonalWallet,
  mockKeyAgentDataTestnet,
  mockInMemoryWallet,
  mockWalletInfoTestnet
} from '@src/utils/mocks/test-helpers';

const mockWalletInfoStore = (
  set: SetState<WalletInfoSlice>,
  get: GetState<BlockchainProviderSlice & WalletInfoSlice>
): WalletInfoSlice => {
  get = () => ({ setBlockchainProvider: jest.fn() } as unknown as BlockchainProviderSlice & WalletInfoSlice);
  return {
    walletInfo: mockWalletInfoTestnet,
    inMemoryWallet: mockInMemoryWallet,
    currentChain: Wallet.Cardano.ChainIds.Preprod,
    keyAgentData: mockKeyAgentDataTestnet,
    ...walletInfoSlice({ set, get })
  };
};

describe('Testing wallet info slice', () => {
  test('should create store hook with wallet information slice', () => {
    const useWalletInfoHook = create(mockWalletInfoStore);
    const { result } = renderHook(() => useWalletInfoHook());

    expect(typeof result.current.walletInfo).toEqual('object');
    expect(typeof result.current.keyAgentData).toEqual('object');
    expect(typeof result.current.setKeyAgentData).toEqual('function');
    expect(result.current.inMemoryWallet).toBeUndefined();
    expect(result.current.cardanoWallet).toBeUndefined();
    expect(typeof result.current.setCardanoWallet).toEqual('function');
    expect(result.current.currentChain).toEqual(Wallet.Cardano.ChainIds.Preprod);
    expect(typeof result.current.setCurrentChain).toEqual('function');
  });

  test('should set in memory wallet state', async () => {
    const useWalletInfoHook = create(mockWalletInfoStore);

    const { result, waitForNextUpdate } = renderHook(() => useWalletInfoHook());

    await act(async () => {
      const cardanoWallet = {
        asyncKeyAgent: {} as any,
        wallet: mockPersonalWallet as any,
        stores: { mock: 'store ' } as any,
        keyAgent: {
          serializableData: mockKeyAgentDataTestnet,
          unsubscribe: jest.fn()
        } as unknown as Wallet.KeyManagement.KeyAgent,
        name: 'any'
      };
      result.current.setCardanoWallet(cardanoWallet);
      await waitForNextUpdate();

      expect(result.current.inMemoryWallet).toMatchObject(mockPersonalWallet);
      expect(result.current.cardanoWallet).toMatchObject(cardanoWallet);
    });
  });

  describe('environment names set correctly', () => {
    let useWalletInfoHook: UseStore<WalletInfoSlice>;
    process.env.AVAILABLE_CHAINS = process.env.AVAILABLE_CHAINS || 'Mainnet,Preprod,Preview';

    beforeEach(() => {
      useWalletInfoHook = create(mockWalletInfoStore);
    });
    test('it returns mainnet', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useWalletInfoHook());
      await act(async () => {
        result.current.setCurrentChain('Mainnet');
        await waitForNextUpdate();
        expect(result.current.environmentName).toBe('Mainnet');
      });
    });

    test('it returns preprod', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useWalletInfoHook());
      await act(async () => {
        result.current.setCurrentChain('Preprod');
        await waitForNextUpdate();
        expect(result.current.environmentName).toBe('Preprod');
      });
    });

    test('it returns preview', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useWalletInfoHook());
      await act(async () => {
        result.current.setCurrentChain('Preview');
        await waitForNextUpdate();
        expect(result.current.environmentName).toBe('Preview');
      });
    });
  });
});
