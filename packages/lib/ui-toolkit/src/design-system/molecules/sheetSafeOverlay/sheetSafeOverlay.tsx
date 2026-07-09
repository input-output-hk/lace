import type { ReactNode } from 'react';
import type { ModalProps } from 'react-native';

import React from 'react';
import { Modal, Platform } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

type SheetSafeOverlayProps = Pick<ModalProps, 'animationType'> & {
  visible?: boolean;
  onRequestClose?: () => void;
  children: ReactNode;
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
 * See: https://sheet.lodev09.com/guides/overlays
 */
export const SheetSafeOverlay = ({
  visible = true,
  onRequestClose,
  animationType = 'fade',
  children,
}: SheetSafeOverlayProps) => {
  if (!visible) return null;

  if (Platform.OS === 'ios') {
    return <FullWindowOverlay>{children}</FullWindowOverlay>;
  }

  return (
    <Modal
      animationType={animationType}
      transparent
      visible
      onRequestClose={onRequestClose}>
      {children}
    </Modal>
  );
};
