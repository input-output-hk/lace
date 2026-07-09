import type { PropsWithChildren, ReactNode } from 'react';
import type { ViewProps } from 'react-native';

import { Portal } from '@gorhom/portal';
import React from 'react';
import {
  StyleSheet,
  requireNativeComponent,
  useWindowDimensions,
} from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

import { isAndroid, isIOS } from '../../util';

type FloatingOverlayProps = {
  children: ReactNode;
};

// Bridge to the native Android view manager registered by `FloatingOverlayPackage`
const FloatingOverlayNative = isAndroid
  ? requireNativeComponent<PropsWithChildren<ViewProps>>('FloatingOverlay')
  : null;

// Renders `children` above any presented `TrueSheet` while letting every touch event pass through to the views beneath.
export const FloatingOverlay = ({ children }: FloatingOverlayProps) => {
  const { width, height } = useWindowDimensions();

  if (isIOS) {
    return <FullWindowOverlay>{children}</FullWindowOverlay>;
  }

  if (isAndroid && FloatingOverlayNative) {
    // Explicit dimensions guarantee Yoga lays out children at full screen regardless of the parent context (matching `FullWindowOverlay`).
    return (
      <FloatingOverlayNative
        style={[StyleSheet.absoluteFill, { width, height }]}>
        {children}
      </FloatingOverlayNative>
    );
  }

  return <Portal>{children}</Portal>;
};
