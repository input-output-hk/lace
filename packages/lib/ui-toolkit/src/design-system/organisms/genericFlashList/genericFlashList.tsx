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

  const onLayout = useCallback<NonNullable<FlashListProps<T>['onLayout']>>(
    event => {
      if (isWeb) {
        flashListProps.onLayout?.(event);
        return;
      }
      const { height, width } = event.nativeEvent.layout;
      const fixedDimension = flashListProps.horizontal ? height : width;

      if (Math.floor(fixedDimension) <= 1) {
        sizeRef.current = true;
      } else if (sizeRef.current) {
        sizeRef.current = false;
        setRemountToken(t => t + 1);
      }

      flashListProps.onLayout?.(event);
    },
    [flashListProps],
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
