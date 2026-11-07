import type { PropsWithChildren } from 'react';
import type { ViewStyle } from 'react-native';

import { BlurView as RNBlurView } from 'expo-blur';
import React, { createContext, useContext } from 'react';
import { View } from 'react-native';

import { useTheme } from '../../../design-tokens';
import { isAndroid, isWeb } from '../../util';

import type { BlurViewProps } from 'expo-blur';

// Unified blur intensity configuration
const UNIFIED_BLUR_INTENSITY = 50;
const WebBlurEnabledContext = createContext(true);

export const useIsWebBlurEnabled = () => useContext(WebBlurEnabledContext);

/** Scope web blur to a surface; a nested provider can enable an overlay within a disabled sheet. */
export const WebBlurProvider = ({
  children,
  enabled,
}: PropsWithChildren<{ enabled: boolean }>) => (
  <WebBlurEnabledContext.Provider value={enabled}>
    {children}
  </WebBlurEnabledContext.Provider>
);

export const BlurView = (props: BlurViewProps) => {
  const { theme } = useTheme();
  const isWebBlurEnabled = useIsWebBlurEnabled();
  const BlurViewBase = isWeb || isAndroid ? View : RNBlurView;

  if (isWeb) {
    if (!isWebBlurEnabled) {
      return <View {...props}>{props.children}</View>;
    }
    // Avoid adding an isolated stacking context inside detached sheets.
    const webStyle = {
      backgroundColor:
        theme.name === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
      backdropFilter: `blur(${UNIFIED_BLUR_INTENSITY}px)`,
      WebkitBackdropFilter: `blur(${UNIFIED_BLUR_INTENSITY}px)`,
    } as ViewStyle;

    return <View {...props} style={[webStyle, props.style]} />;
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
