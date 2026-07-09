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
    // Web implementation with proper backdrop-filter blur
    const webStyle = {
      backgroundColor: 'rgba(255,255,255,0.1)',
      backdropFilter: `blur(${UNIFIED_BLUR_INTENSITY}px)`,
      WebkitBackdropFilter: `blur(${UNIFIED_BLUR_INTENSITY}px)`,
      // Ensure proper stacking context for backdrop-filter
      isolation: 'isolate',
    } as const;

    return (
      <BlurViewBase
        {...props}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={[webStyle as any, props.style]}>
        {props.children}
      </BlurViewBase>
    );
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
