/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as hooksModule from '../../src/hooks';
import { useFeeToken } from '../../src/hooks/useFeeToken';

import type { BlockchainName } from '@lace-lib/util-store';

// Hoisted mocks
const mockUseUICustomisation = vi.hoisted(() => vi.fn());

// Mock the hooks module
vi.mock('../../src/hooks', () => ({
  useLaceSelector: vi.fn(),
}));

// Mock app contract (useUICustomisation)
vi.mock('@lace-contract/app', () => ({
  useUICustomisation: mockUseUICustomisation,
}));

describe('useFeeToken', () => {
  const mockUseLaceSelector = vi.mocked(hooksModule.useLaceSelector);

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLaceSelector.mockReturnValue('mainnet');
    mockUseUICustomisation.mockReturnValue([undefined]);
  });

  it('returns undefined when customisation is not available', () => {
    mockUseUICustomisation.mockReturnValue([undefined]);

    const { result } = renderHook(() =>
      useFeeToken('Cardano' as BlockchainName),
    );

    expect(result.current).toBeUndefined();
  });

  it('returns fee token info for Cardano mainnet', () => {
    mockUseLaceSelector.mockReturnValue('mainnet');
    mockUseUICustomisation.mockReturnValue([
      {
        nativeTokenInfo: ({
          networkType,
        }: {
          networkType: 'mainnet' | 'testnet';
        }) => ({
          tokenId: 'lovelace',
          decimals: 6,
          displayShortName: networkType === 'mainnet' ? 'ADA' : 'tADA',
        }),
      },
    ]);

    const { result } = renderHook(() =>
      useFeeToken('Cardano' as BlockchainName),
    );

    expect(result.current).toEqual({
      tokenId: 'lovelace',
      decimals: 6,
      displayShortName: 'ADA',
    });
  });

  it('returns fee token info for Cardano testnet with tADA ticker', () => {
    mockUseLaceSelector.mockReturnValue('testnet');
    mockUseUICustomisation.mockReturnValue([
      {
        nativeTokenInfo: ({
          networkType,
        }: {
          networkType: 'mainnet' | 'testnet';
        }) => ({
          tokenId: 'lovelace',
          decimals: 6,
          displayShortName: networkType === 'mainnet' ? 'ADA' : 'tADA',
        }),
      },
    ]);

    const { result } = renderHook(() =>
      useFeeToken('Cardano' as BlockchainName),
    );

    expect(result.current).toEqual({
      tokenId: 'lovelace',
      decimals: 6,
      displayShortName: 'tADA',
    });
  });

  it('returns fee token info for Bitcoin', () => {
    mockUseLaceSelector.mockReturnValue('mainnet');
    mockUseUICustomisation.mockReturnValue([
      {
        nativeTokenInfo: (_params: { networkType: 'mainnet' | 'testnet' }) => ({
          tokenId: 'bitcoin',
          decimals: 8,
          displayShortName: 'BTC',
        }),
      },
    ]);

    const { result } = renderHook(() =>
      useFeeToken('Bitcoin' as BlockchainName),
    );

    expect(result.current).toEqual({
      tokenId: 'bitcoin',
      decimals: 8,
      displayShortName: 'BTC',
    });
  });

  it('returns fee token info for Midnight with tDUST ticker on testnet', () => {
    mockUseLaceSelector.mockReturnValue('testnet');
    mockUseUICustomisation.mockReturnValue([
      {
        nativeTokenInfo: ({
          networkType,
        }: {
          networkType: 'mainnet' | 'testnet';
        }) => ({
          tokenId: 'dust',
          decimals: 15,
          displayShortName: networkType === 'testnet' ? 'tDUST' : 'DUST',
        }),
      },
    ]);

    const { result } = renderHook(() =>
      useFeeToken('Midnight' as BlockchainName),
    );

    expect(result.current).toEqual({
      tokenId: 'dust',
      decimals: 15,
      displayShortName: 'tDUST',
    });
  });
});
