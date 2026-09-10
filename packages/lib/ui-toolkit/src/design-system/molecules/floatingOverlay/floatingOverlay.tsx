import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

import { Portal } from '@gorhom/portal';
import {
  requireNativeViewManager,
  requireOptionalNativeModule,
} from 'expo-modules-core';
import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

import { isAndroid, isIOS } from '../../util';

type FloatingOverlayProps = {
  children: ReactNode;
  // Android Modal path only: called on the first touch anywhere on the
  // overlay (and on the hardware back button) so the owner can dismiss it —
  // the Modal window swallows every touch while visible. Kept even when
  // TouchThroughWindow is present as a safety net: it covers the frame before
  // the window flags apply on attach and any host where applying them fails.
  // Unused on iOS/web.
  onTouchThrough?: () => void;
};

// Native view registered by the local `floating-overlay` Expo module
// (apps/lace-next/modules/floating-overlay). On attach it flags the hosting
// Modal window with FLAG_NOT_TOUCHABLE | FLAG_NOT_FOCUSABLE so every touch
// passes through to the window beneath — the Android equivalent of iOS
// FullWindowOverlay. Null until the module is compiled into the app binary.
const TouchThroughWindow =
  isAndroid && requireOptionalNativeModule('FloatingOverlay')
    ? requireNativeViewManager<ViewProps>('FloatingOverlay')
    : null;

// Renders `children` above any presented `TrueSheet` while letting every touch event pass through to the views beneath.
export const FloatingOverlay = ({
  children,
  onTouchThrough,
}: FloatingOverlayProps) => {
  if (isIOS) {
    return <FullWindowOverlay>{children}</FullWindowOverlay>;
  }

  if (isAndroid) {
    // Modal creates a new Dialog window that Android stacks above TrueSheet, but
    // that window consumes every touch while visible. TouchThroughWindow fixes
    // the window itself; the responder wrapper stays as the safety net beneath
    // it — covering the pre-attach frame and hosts where the flags can't be
    // applied — so a swallowed touch always at least dismisses the overlay.
    return (
      <Modal
        transparent
        visible
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => onTouchThrough?.()}>
        {TouchThroughWindow ? (
          <TouchThroughWindow style={styles.touchThroughWindow} />
        ) : null}
        <View
          style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={() => true}
          onResponderGrant={() => onTouchThrough?.()}>
          {children}
        </View>
      </Modal>
    );
  }

  return <Portal>{children}</Portal>;
};

const styles = StyleSheet.create({
  touchThroughWindow: { height: 0, position: 'absolute', width: 0 },
});
