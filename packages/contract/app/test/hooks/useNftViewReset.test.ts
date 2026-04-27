/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useNftViewReset } from '../../src/hooks/useNftViewReset';

enum TestAssetView {
  Assets = 0,
  Nfts = 1,
  Activities = 2,
}

describe('useNftViewReset', () => {
  it('should reset to default view when NFTs are not supported and NFT view is selected', () => {
    const setSelectedAssetView = vi.fn();

    renderHook(() => {
      useNftViewReset({
        shouldShowNfts: false,
        selectedAssetView: TestAssetView.Nfts,
        setSelectedAssetView,
        nftViewValue: TestAssetView.Nfts,
        defaultViewValue: TestAssetView.Assets,
      });
    });

    expect(setSelectedAssetView).toHaveBeenCalledWith(TestAssetView.Assets);
  });

  it('should not reset when NFTs are supported', () => {
    const setSelectedAssetView = vi.fn();

    renderHook(() => {
      useNftViewReset({
        shouldShowNfts: true,
        selectedAssetView: TestAssetView.Nfts,
        setSelectedAssetView,
        nftViewValue: TestAssetView.Nfts,
        defaultViewValue: TestAssetView.Assets,
      });
    });

    expect(setSelectedAssetView).not.toHaveBeenCalled();
  });

  it('should not reset when a different view is selected', () => {
    const setSelectedAssetView = vi.fn();

    renderHook(() => {
      useNftViewReset({
        shouldShowNfts: false,
        selectedAssetView: TestAssetView.Assets,
        setSelectedAssetView,
        nftViewValue: TestAssetView.Nfts,
        defaultViewValue: TestAssetView.Assets,
      });
    });

    expect(setSelectedAssetView).not.toHaveBeenCalled();
  });

  it('should reset when NFT support changes from true to false', () => {
    const setSelectedAssetView = vi.fn();

    const { rerender } = renderHook(
      ({ shouldShowNfts }) => {
        useNftViewReset({
          shouldShowNfts,
          selectedAssetView: TestAssetView.Nfts,
          setSelectedAssetView,
          nftViewValue: TestAssetView.Nfts,
          defaultViewValue: TestAssetView.Assets,
        });
      },
      { initialProps: { shouldShowNfts: true } },
    );

    expect(setSelectedAssetView).not.toHaveBeenCalled();

    rerender({ shouldShowNfts: false });

    expect(setSelectedAssetView).toHaveBeenCalledWith(TestAssetView.Assets);
  });

  it('should work with string view values', () => {
    const setSelectedAssetView = vi.fn();

    renderHook(() => {
      useNftViewReset({
        shouldShowNfts: false,
        selectedAssetView: 'nfts',
        setSelectedAssetView,
        nftViewValue: 'nfts',
        defaultViewValue: 'assets',
      });
    });

    expect(setSelectedAssetView).toHaveBeenCalledWith('assets');
  });

  it('should not call setter when activities view is selected and NFTs are not supported', () => {
    const setSelectedAssetView = vi.fn();

    renderHook(() => {
      useNftViewReset({
        shouldShowNfts: false,
        selectedAssetView: TestAssetView.Activities,
        setSelectedAssetView,
        nftViewValue: TestAssetView.Nfts,
        defaultViewValue: TestAssetView.Assets,
      });
    });

    expect(setSelectedAssetView).not.toHaveBeenCalled();
  });
});
