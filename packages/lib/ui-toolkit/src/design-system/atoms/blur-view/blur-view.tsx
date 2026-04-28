import { BlurView as RNBlurView } from 'expo-blur';
import React from 'react';
import { Platform, View } from 'react-native';

import { useTheme } from '../../../design-tokens';

import type { BlurViewProps } from 'expo-blur';

// Unified blur intensity configuration
const UNIFIED_BLUR_INTENSITY = 50;

export const BlurView = (props: BlurViewProps) => {
  const BlurViewBase =
    Platform.OS === 'web' || Platform.OS === 'android' ? View : RNBlurView;
  if (Platform.OS === 'web') {
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

  const { theme } = useTheme();

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
