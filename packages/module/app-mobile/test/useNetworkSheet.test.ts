/**
 * @vitest-environment jsdom
 */

import { BlockchainNetworkId } from '@lace-contract/network';
import { NavigationControls } from '@lace-lib/navigation';
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as hooksModule from '../src/hooks';
import { useNetworkSheet } from '../src/pages/NetworkSheet/useNetworkSheet';

import type { TranslationKey } from '@lace-contract/i18n';
import type {
  BlockchainTestnetOptions,
  NetworkSliceState,
  NetworkType,
} from '@lace-contract/network';

// mockDispatch records every dispatch routed through useDispatchLaceAction
// with the action key as the first argument, so we can assert call order
// and arguments via a single spy.
const mockDispatch = vi.fn();

vi.mock('../src/hooks', () => ({
  useLaceSelector: vi.fn(),
  useDispatchLaceAction: vi.fn((key: string) => (argument: unknown) => {
    mockDispatch(key, argument);
  }),
}));

vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@lace-contract/analytics', () => ({
  useAnalytics: () => ({ trackEvent: vi.fn() }),
}));

vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: { closeSheet: vi.fn() },
}));

describe('useNetworkSheet', () => {
  const mockUseLaceSelector = vi.mocked(hooksModule.useLaceSelector);

  const cardanoMainnetId = BlockchainNetworkId('cardano-mainnet');
  const cardanoPreprodId = BlockchainNetworkId('cardano-preprod');
  const cardanoPreviewId = BlockchainNetworkId('cardano-preview');

  const blockchainNetworks: NetworkSliceState['blockchainNetworks'] = {
    Cardano: { mainnet: cardanoMainnetId, testnet: cardanoPreprodId },
  };

  const testnetOptions: BlockchainTestnetOptions[] = [
    {
      blockchainName: 'Cardano',
      options: [
        { id: cardanoPreprodId, label: 'preprod' as TranslationKey },
        { id: cardanoPreviewId, label: 'preview' as TranslationKey },
      ],
    },
  ];

  const mockSelectors = (currentNetworkType: NetworkType) => {
    mockUseLaceSelector.mockImplementation((key: string) => {
      if (key === 'network.selectNetworkType') return currentNetworkType;
      if (key === 'network.selectBlockchainNetworks') return blockchainNetworks;
      if (key === 'network.selectAllTestnetOptions') return testnetOptions;
      throw new Error(`Unexpected useLaceSelector: ${key}`);
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists testnet selection before flipping networkType on confirm', () => {
    // Starting on mainnet; user picks testnet + preview.
    mockSelectors('mainnet');
    const { result } = renderHook(() => useNetworkSheet());

    act(() => {
      result.current.onNetworkTypeChange('testnet');
      result.current.onTestnetChange('Cardano', cardanoPreviewId);
    });

    act(() => {
      result.current.onConfirm();
    });

    // Two dispatches; setBlockchainNetworks must come BEFORE setNetworkType
    // so the active chainId never resolves through a stale testnet selection.
    expect(mockDispatch).toHaveBeenCalledTimes(2);
    expect(mockDispatch.mock.calls[0]).toEqual([
      'network.setBlockchainNetworks',
      {
        blockchain: 'Cardano',
        mainnet: cardanoMainnetId,
        testnet: cardanoPreviewId,
      },
    ]);
    expect(mockDispatch.mock.calls[1]).toEqual([
      'network.setNetworkType',
      'testnet',
    ]);
    expect(NavigationControls.closeSheet).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch setNetworkType when networkType is unchanged', () => {
    // Already on testnet, user just picks a different testnet
    mockSelectors('testnet');
    const { result } = renderHook(() => useNetworkSheet());

    act(() => {
      result.current.onTestnetChange('Cardano', cardanoPreviewId);
    });

    act(() => {
      result.current.onConfirm();
    });

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch.mock.calls[0]).toEqual([
      'network.setBlockchainNetworks',
      {
        blockchain: 'Cardano',
        mainnet: cardanoMainnetId,
        testnet: cardanoPreviewId,
      },
    ]);
  });

  it('dispatches nothing on cancel', () => {
    mockSelectors('mainnet');
    const { result } = renderHook(() => useNetworkSheet());

    act(() => {
      result.current.onNetworkTypeChange('testnet');
      result.current.onTestnetChange('Cardano', cardanoPreviewId);
      result.current.onClose();
    });

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(NavigationControls.closeSheet).toHaveBeenCalledTimes(1);
  });
});
