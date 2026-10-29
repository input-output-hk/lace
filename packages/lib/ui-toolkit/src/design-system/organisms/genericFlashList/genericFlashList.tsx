import {
  FlashList,
  type FlashListProps,
  type FlashListRef,
} from '@shopify/flash-list';
import React, { useCallback, useMemo, useRef, useState, type Ref } from 'react';
import Animated from 'react-native-reanimated';

import { useTheme } from '../../../design-tokens';
import { isWeb } from '../../util/commons';
import {
  DEFAULT_GRID_COLUMNS,
  type GridColumnsConfig,
} from '../flashListTypes';

const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList,
) as typeof FlashList;

export interface GenericFlashListProps<T> extends FlashListProps<T> {
  gridColumns?: GridColumnsConfig | number;
  /** Ref to the underlying FlashList (function components do not accept `ref`). */
  flashListRef?: Ref<FlashListRef<T>> | null;
}

export const GenericFlashList = <T,>(props: GenericFlashListProps<T>) => {
  const { gridColumns, flashListRef, ...flashListProps } = props;
  const { layoutSize } = useTheme();
  const [remountToken, setRemountToken] = useState(0);
  const sizeRef = useRef(false);

  const numberColumns = useMemo(() => {
    if (!gridColumns) return flashListProps.numColumns;
    if (typeof gridColumns === 'number') return gridColumns;

    const config = { ...DEFAULT_GRID_COLUMNS, ...gridColumns };
    return config[layoutSize];
  }, [gridColumns, layoutSize, flashListProps.numColumns]);

  const { horizontal: isHorizontal, onLayout: consumerOnLayout } =
    flashListProps;
  // A list of one column has no column width to get wrong, so it never needs
  // the remount below.
  const isGrid = (numberColumns ?? 1) > 1;

  const onLayout = useCallback<NonNullable<FlashListProps<T>['onLayout']>>(
    event => {
      // The remount exists only to re-measure GRID columns: the dApp explorer
      // resized its columns when a first near-zero-width layout was followed
      // by a real one (what a sheet animating open produces). Remounting takes
      // the whole list with it, header included — focus, the keyboard and a
      // half-typed search among it — so single-column lists opt out (ADR 64).
      if (isWeb || !isGrid) {
        consumerOnLayout?.(event);
        return;
      }
      const { height, width } = event.nativeEvent.layout;
      const fixedDimension = isHorizontal ? height : width;

      if (Math.floor(fixedDimension) <= 1) {
        sizeRef.current = true;
      } else if (sizeRef.current) {
        sizeRef.current = false;
        setRemountToken(t => t + 1);
      }

      consumerOnLayout?.(event);
    },
    [consumerOnLayout, isHorizontal, isGrid],
  );

  const extraData = useMemo(() => {
    const originalExtraData = flashListProps.extraData as
      | Record<string, unknown>
      | undefined;
    return {
      ...originalExtraData,
      numberColumns,
    };
  }, [flashListProps.extraData, numberColumns]);

  return (
    <AnimatedFlashList<T>
      key={isWeb ? undefined : `generic-flash-list-${remountToken}`}
      {...flashListProps}
      ref={flashListRef}
      numColumns={numberColumns}
      extraData={extraData}
      onLayout={onLayout}
    />
  );
};
