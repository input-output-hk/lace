import type { ReactNode } from 'react';
import type { ModalProps } from 'react-native';

import React, { useEffect, useState } from 'react';
import { AppState, Modal, Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FullWindowOverlay } from 'react-native-screens';

type SheetSafeOverlayProps = Pick<ModalProps, 'animationType'> & {
  visible?: boolean;
  onRequestClose?: () => void;
  remountOnActivate?: boolean;
  children: ReactNode;
};

// Counts transitions to the 'active' AppState so consumers can key a fresh
// mount per activation. Only counts while enabled to avoid needless renders.
const useAppActivationCount = (enabled: boolean) => {
  const [activationCount, setActivationCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        setActivationCount(count => count + 1);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [enabled]);

  return activationCount;
};

/**
 * Renders content above any presented `TrueSheet`.
 *
 * On iOS the overlay is mounted via `FullWindowOverlay` from
 * `react-native-screens`, which renders into a separate UIWindow above the
 * sheet's `UIPresentationController`. On Android and web we keep using
 * React Native's `Modal` (with `transparent`), which already sits above the
 * sheet's native container.
 *
 * `remountOnActivate` remounts the iOS `FullWindowOverlay` every time the app
 * returns to the 'active' AppState. System UI that takes over the key window
 * (e.g. the Face ID / Touch ID dialog) can leave the overlay's UIWindow
 * detached when it dismisses, so its content never shows again; a fresh mount
 * creates a new UIWindow. Children are remounted, so opt in only where losing
 * their local state on re-activation is acceptable.
 *
 * See: https://sheet.lodev09.com/guides/overlays
 */
export const SheetSafeOverlay = ({
  visible = true,
  onRequestClose,
  animationType = 'fade',
  remountOnActivate = false,
  children,
}: SheetSafeOverlayProps) => {
  const activationCount = useAppActivationCount(
    remountOnActivate && Platform.OS === 'ios',
  );

  if (!visible) return null;

  if (Platform.OS === 'ios') {
    return (
      <FullWindowOverlay key={activationCount}>{children}</FullWindowOverlay>
    );
  }

  return (
    <Modal
      animationType={animationType}
      transparent
      visible
      onRequestClose={onRequestClose}>
      {Platform.OS === 'android' ? (
        // Local gesture root: on Android a Modal's content is its own native
        // root view, outside the app-root GestureHandlerRootView, so every
        // gesture-handler touchable inside (IconButton, and anything built on
        // it — e.g. the lock screen's password-visibility toggle) gets no taps
        // without a root in its subtree. Same fix as the TrueSheet header
        // (organisms/sheet). iOS renders in the app's own tree via
        // FullWindowOverlay, and web needs no root, so neither is wrapped.
        <GestureHandlerRootView style={styles.gestureRoot}>
          {children}
        </GestureHandlerRootView>
      ) : (
        children
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
});
