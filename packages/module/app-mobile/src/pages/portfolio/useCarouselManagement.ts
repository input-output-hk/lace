import type React from 'react';
import type { FlatList } from 'react-native';

import debounce from 'lodash/debounce';
import { useCallback, useMemo, useRef, useEffect } from 'react';

import { AccountViewType } from './types';

import type { AccountView, AssetView, SelectedAssetView } from './types';

const SCROLL_DEBOUNCE_DELAY = 200;
const SCROLL_TO_INDEX_RETRY_DELAY = 500;

interface UseCarouselManagementProps {
  containerWidth: number;
  activeIndex: number;
  selectedAssetView: SelectedAssetView;
  accountsData: AccountView[];
  assetsData: AssetView[];
  onActiveIndexChange: (index: number) => void;
  onSelectedAssetViewChange: (view: SelectedAssetView) => void;
}

interface UseCarouselManagementReturn {
  accountsCarouselRef: React.RefObject<FlatList | null>;
  assetsCarouselRef: React.RefObject<FlatList | null>;
  handleAssetScroll: (event: {
    nativeEvent: { contentOffset: { x: number } };
  }) => void;
  handleAccountScroll: (event: {
    nativeEvent: { contentOffset: { x: number } };
  }) => void;
  accountsKeyExtractor: (item: AccountView) => string;
  assetsKeyExtractor: (item: AssetView) => string;
  getItemLayout: (
    _: unknown,
    index: number,
  ) => { length: number; offset: number; index: number };
  onAccountsScrollToIndexFailed: (info: {
    index: number;
    averageItemLength: number;
  }) => void;
  onAssetsScrollToIndexFailed: (info: {
    index: number;
    averageItemLength: number;
  }) => void;
}

export const useCarouselManagement = ({
  containerWidth,
  activeIndex,
  selectedAssetView,
  accountsData,
  assetsData,
  onActiveIndexChange,
  onSelectedAssetViewChange,
}: UseCarouselManagementProps): UseCarouselManagementReturn => {
  const accountsCarouselRef = useRef<FlatList>(null);
  const assetsCarouselRef = useRef<FlatList>(null);

  const onAssetScrollStop = useMemo(
    () =>
      debounce((offset: number) => {
        const index = Math.round(offset / containerWidth);
        const viewType = assetsData[index]?.type;
        const hasViewTypeChanged =
          viewType !== undefined && selectedAssetView !== viewType;
        if (hasViewTypeChanged) {
          onSelectedAssetViewChange(viewType);
        }
      }, SCROLL_DEBOUNCE_DELAY),
    [containerWidth, assetsData, selectedAssetView, onSelectedAssetViewChange],
  );

  const handleAssetScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      onAssetScrollStop(event.nativeEvent.contentOffset.x);
    },
    [onAssetScrollStop],
  );

  const onAccountScrollStop = useMemo(
    () =>
      debounce((offset: number) => {
        const index = Math.round(offset / containerWidth);
        const hasIndexChanged = activeIndex !== index;
        if (hasIndexChanged) {
          onActiveIndexChange(index);
        }
      }, SCROLL_DEBOUNCE_DELAY),
    [containerWidth, onActiveIndexChange, activeIndex],
  );

  const handleAccountScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      onAccountScrollStop(event.nativeEvent.contentOffset.x);
    },
    [onAccountScrollStop],
  );

  const accountsKeyExtractor = useCallback(
    (item: AccountView) =>
      item.type === AccountViewType.Portfolio
        ? 'portfolio'
        : `account-${item.accountIndex}`,
    [],
  );

  const assetsKeyExtractor = useCallback(
    (item: AssetView) => item.type.toString(),
    [],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: containerWidth,
      offset: containerWidth * index,
      index,
    }),
    [containerWidth],
  );

  const onAccountsScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      const wait = new Promise(resolve =>
        setTimeout(resolve, SCROLL_TO_INDEX_RETRY_DELAY),
      );
      void wait.then(() => {
        accountsCarouselRef.current?.scrollToOffset({
          offset: info.averageItemLength * info.index,
          animated: true,
        });
      });
    },
    [],
  );

  const onAssetsScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      const wait = new Promise(resolve =>
        setTimeout(resolve, SCROLL_TO_INDEX_RETRY_DELAY),
      );
      void wait.then(() => {
        assetsCarouselRef.current?.scrollToOffset({
          offset: info.averageItemLength * info.index,
          animated: true,
        });
      });
    },
    [],
  );

  // Sync assets carousel with selectedAssetView
  useEffect(() => {
    const hasAssetsCarousel =
      assetsCarouselRef.current !== null && assetsData.length > 0;
    if (!hasAssetsCarousel) return;

    const index = assetsData.findIndex(item => item.type === selectedAssetView);
    const isValidIndex = index >= 0;
    if (isValidIndex) {
      assetsCarouselRef.current?.scrollToIndex({
        index,
        animated: true,
      });
    }
  }, [selectedAssetView, assetsData]);

  // Sync accounts carousel with activeIndex
  useEffect(() => {
    const hasAccountsCarousel =
      accountsCarouselRef.current !== null && accountsData.length > 0;
    if (!hasAccountsCarousel) return;

    const targetIndex = Math.max(
      0,
      Math.min(activeIndex, accountsData.length - 1),
    );
    accountsCarouselRef.current?.scrollToIndex({
      index: targetIndex,
      animated: true,
    });
  }, [activeIndex, accountsData.length]);

  // Cleanup debounced functions
  useEffect(
    () => () => {
      onAssetScrollStop.cancel();
      onAccountScrollStop.cancel();
    },
    [onAssetScrollStop, onAccountScrollStop],
  );

  return {
    accountsCarouselRef,
    assetsCarouselRef,
    handleAssetScroll,
    handleAccountScroll,
    accountsKeyExtractor,
    assetsKeyExtractor,
    getItemLayout,
    onAccountsScrollToIndexFailed,
    onAssetsScrollToIndexFailed,
  };
};
