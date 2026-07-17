import type { PropsWithChildren, ReactNode } from 'react';
import type { ViewProps } from 'react-native';

import { Portal } from '@gorhom/portal';
import React from 'react';
import {
  Modal,
  StyleSheet,
  UIManager,
  View,
  requireNativeComponent,
  useWindowDimensions,
} from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

import { isAndroid, isIOS } from '../../util';

type FloatingOverlayProps = {
  children: ReactNode;
};

// Bridge to the native Android view manager registered by `FloatingOverlayPackage`. Guard with hasViewManagerConfig so that falls back to Portal when the native package is not yet registered
const FloatingOverlayNative =
  isAndroid && UIManager.hasViewManagerConfig('FloatingOverlay')
    ? requireNativeComponent<PropsWithChildren<ViewProps>>('FloatingOverlay')
    : null;

// Renders `children` above any presented `TrueSheet` while letting every touch event pass through to the views beneath.
export const FloatingOverlay = ({ children }: FloatingOverlayProps) => {
  const { width, height } = useWindowDimensions();

  if (isIOS) {
    return <FullWindowOverlay>{children}</FullWindowOverlay>;
  }

  if (isAndroid) {
    if (FloatingOverlayNative) {
      // Explicit dimensions guarantee Yoga lays out children at full screen regardless of the parent context (matching `FullWindowOverlay`).
      return (
        <FloatingOverlayNative
          style={[StyleSheet.absoluteFill, { width, height }]}>
          {children}
        </FloatingOverlayNative>
      );
    }
    // Fallback before FloatingOverlayPackage is built: Modal creates a new Dialog window that Android stacks above TrueSheet.
    return (
      <Modal
        transparent
        visible
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => undefined}>
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {children}
        </View>
      </Modal>
    );
  }

  return <Portal>{children}</Portal>;
};
