import type { RefObject } from 'react';
import type { View } from 'react-native';

import { useCallback, useContext, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  SafeAreaInsetsContext,
  type EdgeInsets,
} from 'react-native-safe-area-context';

import { isAndroid } from '../commons';

type Layout = { x: number; y: number; width: number; height: number };
type BoundaryInsets = Partial<Pick<EdgeInsets, 'bottom' | 'top'>>;
export type DropdownPosition = {
  layout: Layout | null;
  boundaryLayout: Layout | null;
  shouldOpenUpwards: boolean;
  measure: (
    ref: View | null,
    boundaryRef?: RefObject<View | null>,
    boundaryInsets?: BoundaryInsets,
  ) => void;
  screenHeight: number;
};

const ZERO_INSETS: EdgeInsets = { top: 0, bottom: 0, left: 0, right: 0 };

export const useDropdownPosition = (menuHeight: number): DropdownPosition => {
  const [layout, setLayout] = useState<Layout | null>(null);
  const [boundaryLayout, setBoundaryLayout] = useState<Layout | null>(null);
  const [shouldOpenUpwards, setShouldOpenUpwards] = useState(false);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useContext(SafeAreaInsetsContext) ?? ZERO_INSETS;

  const screenHeight = isAndroid
    ? windowHeight - (insets.top + insets.bottom)
    : windowHeight;

  const handleMeasure = (
    layout: Layout,
    boundaryLayout?: Layout,
    boundaryInsets?: BoundaryInsets,
  ) => {
    const { y, height } = layout;
    const boundaryTop = (boundaryLayout?.y ?? 0) + (boundaryInsets?.top ?? 0);
    const boundaryBottom = boundaryLayout
      ? boundaryLayout.y + boundaryLayout.height - (boundaryInsets?.bottom ?? 0)
      : screenHeight;

    const spaceBelow = Math.max(0, boundaryBottom - (y + height));
    const spaceAbove = Math.max(0, y - boundaryTop);

    const shouldOpenUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;

    setLayout(layout);
    setBoundaryLayout(boundaryLayout ?? null);
    setShouldOpenUpwards(shouldOpenUp);
  };

  const measureView = (
    ref: View | null,
    callback: (layout: Layout) => void,
  ) => {
    ref?.measureInWindow?.((...args) => {
      const [x, y, width, height] = args;
      callback({ x, y, width, height });
    });
  };

  const measure = useCallback(
    (
      ref: View | null,
      boundaryRef?: RefObject<View | null>,
      boundaryInsets?: BoundaryInsets,
    ) => {
      measureView(ref, measuredLayout => {
        if (!boundaryRef?.current) {
          handleMeasure(measuredLayout, undefined, boundaryInsets);
          return;
        }

        measureView(boundaryRef.current, boundaryLayout => {
          handleMeasure(measuredLayout, boundaryLayout, boundaryInsets);
        });
      });
    },
    [menuHeight, screenHeight],
  );

  return {
    layout,
    boundaryLayout,
    shouldOpenUpwards,
    measure,
    screenHeight,
  };
};
