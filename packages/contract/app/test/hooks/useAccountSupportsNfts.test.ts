/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAccountSupportsNfts } from '../../src/hooks/useAccountSupportsNfts';
import { useUICustomisation } from '../../src/hooks/useUICustomisation';

import type { AccountUICustomisation } from '../../src/types';

// Mock useUICustomisation
vi.mock('../../src/hooks/useUICustomisation', () => ({
  useUICustomisation: vi.fn(),
}));

const mockUseUICustomisation = vi.mocked(useUICustomisation);

/** `useUICustomisation` is generic; the vitest mock is typed as all loadable customisations at once. */
const mockLoadAccountUICustomisations = (
  customisations: AccountUICustomisation[],
) => {
  mockUseUICustomisation.mockReturnValue(customisations as never);
};

const createMockCustomisation = (
  overrides: Partial<{
    key: string;
    supportsNfts: boolean;
    uiCustomisationSelector: (params: { blockchainName: string }) => boolean;
    nativeTokenInfo: (_params: { networkType: 'mainnet' | 'testnet' }) => {
      tokenId: string;
      decimals: number;
      displayShortName: string;
    };
  }>,
) =>
  ({
    key: 'test',
    supportsNfts: true,
    uiCustomisationSelector: () => false,
    nativeTokenInfo: () => ({
      tokenId: 'mock',
      decimals: 0,
      displayShortName: 'MOCK',
    }),
    ...overrides,
  } as AccountUICustomisation);

describe('useAccountSupportsNfts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('accountSupportsNfts', () => {
    it('should return true when no matching customisation is found', () => {
      mockLoadAccountUICustomisations([
        createMockCustomisation({
          key: 'cardano',
          uiCustomisationSelector: ({ blockchainName }) =>
            blockchainName === 'Cardano',
          supportsNfts: true,
        }),
      ]);

      const { result } = renderHook(() =>
        useAccountSupportsNfts({ accounts: [] }),
      );

      expect(
        result.current.accountSupportsNfts({ blockchainName: 'Unknown' }),
      ).toBe(true);
    });

    it('should return true when matching customisation has supportsNfts: true', () => {
      mockLoadAccountUICustomisations([
        createMockCustomisation({
          key: 'cardano',
          uiCustomisationSelector: ({ blockchainName }) =>
            blockchainName === 'Cardano',
          supportsNfts: true,
        }),
      ]);

      const { result } = renderHook(() =>
        useAccountSupportsNfts({ accounts: [] }),
      );

      expect(
        result.current.accountSupportsNfts({ blockchainName: 'Cardano' }),
      ).toBe(true);
    });

    it('should return false when matching customisation has supportsNfts: false', () => {
      mockLoadAccountUICustomisations([
        createMockCustomisation({
          key: 'midnight',
          uiCustomisationSelector: ({ blockchainName }) =>
            blockchainName === 'Midnight',
          supportsNfts: false,
        }),
      ]);

      const { result } = renderHook(() =>
        useAccountSupportsNfts({ accounts: [] }),
      );

      expect(
        result.current.accountSupportsNfts({ blockchainName: 'Midnight' }),
      ).toBe(false);
    });

    it('should return true when matching customisation has no supportsNfts property', () => {
      mockLoadAccountUICustomisations([
        {
          key: 'bitcoin',
          uiCustomisationSelector: ({
            blockchainName,
          }: {
            blockchainName: string;
          }) => blockchainName === 'Bitcoin',
          nativeTokenInfo: () => ({
            tokenId: 'btc',
            decimals: 8,
            displayShortName: 'BTC',
          }),
        } as unknown as AccountUICustomisation,
      ]);

      const { result } = renderHook(() =>
        useAccountSupportsNfts({ accounts: [] }),
      );

      expect(
        result.current.accountSupportsNfts({ blockchainName: 'Bitcoin' }),
      ).toBe(true);
    });

    it('should return true when customisations array is empty', () => {
      mockLoadAccountUICustomisations([]);

      const { result } = renderHook(() =>
        useAccountSupportsNfts({ accounts: [] }),
      );

      expect(
        result.current.accountSupportsNfts({ blockchainName: 'Cardano' }),
      ).toBe(true);
    });

    it('should find the first matching customisation', () => {
      mockLoadAccountUICustomisations([
        createMockCustomisation({
          key: 'midnight',
          uiCustomisationSelector: ({ blockchainName }) =>
            blockchainName === 'Midnight',
          supportsNfts: false,
        }),
        createMockCustomisation({
          key: 'cardano',
          uiCustomisationSelector: ({ blockchainName }) =>
            blockchainName === 'Cardano',
          supportsNfts: true,
        }),
      ]);

      const { result } = renderHook(() =>
        useAccountSupportsNfts({ accounts: [] }),
      );

      expect(
        result.current.accountSupportsNfts({ blockchainName: 'Midnight' }),
      ).toBe(false);
      expect(
        result.current.accountSupportsNfts({ blockchainName: 'Cardano' }),
      ).toBe(true);
    });
  });

  describe('hasAnyAccountNftSupport', () => {
    it('should return false when accounts array is empty', () => {
      mockLoadAccountUICustomisations([
        createMockCustomisation({
          key: 'cardano',
          supportsNfts: true,
        }),
      ]);

      const { result } = renderHook(() =>
        useAccountSupportsNfts({ accounts: [] }),
      );

      expect(result.current.hasAnyAccountNftSupport).toBe(false);
    });

    it('should return false when all accounts are Midnight (no NFT support)', () => {
      mockLoadAccountUICustomisations([
        createMockCustomisation({
          key: 'midnight',
          uiCustomisationSelector: ({ blockchainName }) =>
            blockchainName === 'Midnight',
          supportsNfts: false,
        }),
        createMockCustomisation({
          key: 'cardano',
          uiCustomisationSelector: ({ blockchainName }) =>
            blockchainName === 'Cardano',
          supportsNfts: true,
        }),
      ]);

      const accounts = [
        { blockchainName: 'Midnight' },
        { blockchainName: 'Midnight' },
      ];

      const { result } = renderHook(() => useAccountSupportsNfts({ accounts }));

      expect(result.current.hasAnyAccountNftSupport).toBe(false);
    });

    it('should return true when mixed accounts include one with NFT support', () => {
      mockLoadAccountUICustomisations([
        createMockCustomisation({
          key: 'midnight',
          uiCustomisationSelector: ({ blockchainName }) =>
            blockchainName === 'Midnight',
          supportsNfts: false,
        }),
        createMockCustomisation({
          key: 'cardano',
          uiCustomisationSelector: ({ blockchainName }) =>
            blockchainName === 'Cardano',
          supportsNfts: true,
        }),
      ]);

      const accounts = [
        { blockchainName: 'Midnight' },
        { blockchainName: 'Cardano' },
      ];

      const { result } = renderHook(() => useAccountSupportsNfts({ accounts }));

      expect(result.current.hasAnyAccountNftSupport).toBe(true);
    });
  });
});
