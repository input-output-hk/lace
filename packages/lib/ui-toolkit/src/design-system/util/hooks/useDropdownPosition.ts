import type { View } from 'react-native';

import { useCallback, useContext, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  SafeAreaInsetsContext,
  type EdgeInsets,
} from 'react-native-safe-area-context';

import { isAndroid } from '../commons';

type Layout = { x: number; y: number; width: number; height: number };

const ZERO_INSETS: EdgeInsets = { top: 0, bottom: 0, left: 0, right: 0 };

export const useDropdownPosition = (menuHeight: number) => {
  const [layout, setLayout] = useState<Layout | null>(null);
  const [shouldOpenUpwards, setShouldOpenUpwards] = useState(false);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useContext(SafeAreaInsetsContext) ?? ZERO_INSETS;

  const screenHeight = isAndroid
    ? windowHeight - (insets.top + insets.bottom)
    : windowHeight;

  const handleMeasure = (layout: Layout) => {
    const { y, height } = layout;

    const spaceBelow = screenHeight - (y + height);
    const spaceAbove = y;

    const shouldOpenUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;

    setLayout(layout);
    setShouldOpenUpwards(shouldOpenUp);
  };

  const measure = useCallback(
    (ref: View | null) => {
      ref?.measureInWindow?.((...args) => {
        const [x, y, width, height] = args;
        handleMeasure({ x, y, width, height });
      });
    },
    [menuHeight, screenHeight],
  );

  return { layout, shouldOpenUpwards, measure, screenHeight };
};
