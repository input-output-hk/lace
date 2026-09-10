import { BlurView as RNBlurView } from 'expo-blur';
import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../../design-tokens';
import { isAndroid, isWeb } from '../../util';

import type { BlurViewProps } from 'expo-blur';

// Unified blur intensity configuration
const UNIFIED_BLUR_INTENSITY = 50;

export const BlurView = (props: BlurViewProps) => {
  const { theme } = useTheme();
  const BlurViewBase = isWeb || isAndroid ? View : RNBlurView;

  if (isWeb) {
    // backdrop-filter + isolation create GPU compositing layers that cause visual
    // artifacts (flickering / empty-rectangle flash) inside position:fixed detached
    // modal containers (side panel). The blur is invisible anyway when the parent
    // has a solid background, so we render a plain View.
    return <View {...props}>{props.children}</View>;
  }

  if (isAndroid) {
    return <BlurViewBase {...props}>{props.children}</BlurViewBase>;
  }

  // On native, use the RNBlurView without experimental methods that cause crashes
  return (
    <RNBlurView
      {...props}
      tint={theme.name === 'dark' ? 'dark' : 'light'}
      intensity={UNIFIED_BLUR_INTENSITY}>
      {props.children}
    </RNBlurView>
  );
};
