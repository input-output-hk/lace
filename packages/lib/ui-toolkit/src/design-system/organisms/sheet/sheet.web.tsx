import type { ReactNode } from 'react';
import type {
  PanResponderInstance,
  ScrollViewProps,
  ViewStyle,
} from 'react-native';

import noop from 'lodash/noop';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { radius, spacing, useTheme } from '../../../design-tokens';
import { Icon, IconButton } from '../../atoms';
import { isExtensionSidePanel } from '../../util/commons';

import type { Theme } from '../../../design-tokens';

const WEB_TOUCH_ACTION_NONE = { touchAction: 'none' } as unknown as ViewStyle;
const WEB_BACKDROP_BLUR = {
  backdropFilter: 'blur(1px)',
  WebkitBackdropFilter: 'blur(1px)',
  isolation: 'isolate',
} as unknown as ViewStyle;

type SheetApi = {
  isOpen: boolean;
  expand: () => void;
  close: () => void;
  snapToIndex?: (index: number) => void;
};

interface SheetProps {
  children: ReactNode;
  initialIndex: number | undefined;
  enableBackdrop?: boolean;
  /**
   * When false, user cannot close the sheet by dragging. Default true.
   */
  enablePanDownToClose?: boolean;
  /**
   * When false, tapping the backdrop does not close the sheet. Default true.
   */
  enableBackdropClose?: boolean;
  /**
   * When provided, called before closing. Return false to prevent close.
   * Used by the navigator to enforce preventClose (e.g. send in progress).
   */
  onCloseRequest?: () => boolean;
  testID?: string;
  sheetRef?: React.RefObject<SheetApi>;
  closeSheet?: () => void;
  onClose?: () => void;
  onChange?: (index: number) => void;
}

type WebSheetScrollProps = ScrollViewProps & {
  children: ReactNode | ReactNode[];
};

const snapToIndex =
  (handlers: { open: () => void; close: () => void }) => (index: number) => {
    if (index === -1) handlers.close();
    else handlers.open();
  };

const shouldStartDrag = (params: {
  isEnabled: boolean;
  isOpen: boolean;
  dy: number;
  dx: number;
}): boolean => {
  const { isEnabled, isOpen, dy, dx } = params;
  return isEnabled && isOpen && dy > 2 && Math.abs(dy) > Math.abs(dx);
};

const useSheetApi = (params: {
  initialIndex: number | undefined;
  onClose: (() => void) | undefined;
  sheetRef: React.RefObject<SheetApi> | undefined;
}) => {
  const { initialIndex, onClose = noop, sheetRef } = params;

  const [isOpen, setIsOpen] = useState<boolean>(
    initialIndex !== undefined && initialIndex >= 0,
  );

  const openRef = useRef(isOpen);
  useEffect(() => {
    openRef.current = isOpen;
  }, [isOpen]);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const closeInternal = useCallback(() => {
    setIsOpen(previous => {
      if (!previous) return previous;
      onCloseRef.current?.();
      return false;
    });
  }, []);

  const openInternal = useCallback(() => {
    setIsOpen(previous => (previous ? previous : true));
  }, []);

  const apiRef = useRef<SheetApi | null>(null);
  if (!apiRef.current) {
    const api = {
      expand: openInternal,
      close: closeInternal,
      snapToIndex: snapToIndex({ open: openInternal, close: closeInternal }),
    } as SheetApi;

    Object.defineProperty(api, 'isOpen', {
      enumerable: true,
      configurable: false,
      get: () => openRef.current,
      set: (value: boolean) => {
        if (value) openInternal();
        else closeInternal();
      },
    });

    apiRef.current = api;
  }

  useLayoutEffect(() => {
    if (!sheetRef) return;
    const mutable = sheetRef as React.MutableRefObject<SheetApi | null>;
    mutable.current = apiRef.current;
    return () => {
      mutable.current = null;
    };
  }, [sheetRef]);

  const rootVisibility = useMemo<ViewStyle>(
    () => ({ display: isOpen ? 'flex' : 'none' }),
    [isOpen],
  );

  return { isOpen, openRef, openInternal, closeInternal, rootVisibility };
};

const useDragToClose = (params: {
  isEnabled: boolean;
  openRef: React.MutableRefObject<boolean>;
  closeInternal: () => void;
}) => {
  const { isEnabled, openRef, closeInternal } = params;

  const translateY = useRef(new Animated.Value(0)).current;

  const closeWithGesture = useCallback(() => {
    Animated.timing(translateY, {
      toValue: 1000,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      translateY.setValue(0);
      closeInternal();
    });
  }, [closeInternal, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => isEnabled,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          shouldStartDrag({
            isEnabled,
            isOpen: openRef.current,
            dy: gesture.dy,
            dx: gesture.dx,
          }),
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          shouldStartDrag({
            isEnabled,
            isOpen: openRef.current,
            dy: gesture.dy,
            dx: gesture.dx,
          }),
        onPanResponderMove: (_event, gesture) => {
          if (!isEnabled) return;
          translateY.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_event, gesture) => {
          if (!isEnabled) return;
          const shouldClose = gesture.dy > 120 || gesture.vy > 1.2;
          if (shouldClose) closeWithGesture();
          else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [closeWithGesture, isEnabled, openRef, translateY],
  );

  return { translateY, panHandlers: panResponder.panHandlers };
};

const PopupHandle = ({
  theme,
  onDragHandlers,
}: {
  theme: Theme;
  onDragHandlers: PanResponderInstance['panHandlers'];
}) => {
  const styles = useMemo(() => popupHandleStyles(theme), [theme]);
  return (
    <View
      style={[styles.handleArea, WEB_TOUCH_ACTION_NONE]}
      {...(onDragHandlers as object)}>
      <View style={styles.handle} />
    </View>
  );
};

const SheetHost = ({
  children,
  enableBackdrop = true,
  enablePanDownToClose = true,
  enableBackdropClose = true,
  onCloseRequest,
  initialIndex,
  onClose = noop,
  onChange,
  sheetRef,
  closeSheet = noop,
  testID,
}: SheetProps) => {
  const { theme, isSideMenu } = useTheme();

  const { isOpen, openRef, closeInternal, rootVisibility } = useSheetApi({
    initialIndex,
    onClose,
    sheetRef,
  });

  const requestClose = useCallback(() => {
    if (onCloseRequest && !onCloseRequest()) return;
    onChange?.(-1);
    closeInternal();
    closeSheet();
  }, [closeInternal, closeSheet, onChange, onCloseRequest]);

  const canDragToClose =
    enablePanDownToClose && isExtensionSidePanel && !isSideMenu;
  const { translateY, panHandlers } = useDragToClose({
    isEnabled: canDragToClose,
    openRef,
    closeInternal: requestClose,
  });

  const styles = useMemo(
    () => getStyles({ theme, isSideMenu }),
    [theme, isSideMenu],
  );

  return (
    <View
      pointerEvents={isOpen ? 'auto' : 'none'}
      style={[styles.root, rootVisibility]}
      testID={testID}>
      {enableBackdrop && (
        <Pressable
          style={[styles.backdrop, WEB_BACKDROP_BLUR]}
          onPress={enableBackdropClose ? requestClose : undefined}
        />
      )}

      <Animated.View style={[styles.content, { transform: [{ translateY }] }]}>
        {canDragToClose && (
          <PopupHandle theme={theme} onDragHandlers={panHandlers} />
        )}
        <IconButton.Static
          icon={<Icon name="Cancel" size={24} />}
          onPress={requestClose}
          containerStyle={styles.closeButton}
          testID={'side-sheet-close-button'}
        />
        {children}
      </Animated.View>
    </View>
  );
};

const WebSheetScroll = forwardRef<ScrollView, WebSheetScrollProps>(
  ({ children, keyboardShouldPersistTaps = 'handled', ...props }, ref) => (
    <ScrollView
      ref={ref}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...props}>
      {children}
    </ScrollView>
  ),
);

export const Sheet = Object.assign(SheetHost, {
  Scroll: WebSheetScroll,
});

const getStyles = ({
  theme,
  isSideMenu,
}: {
  theme: Theme;
  isSideMenu: boolean;
}) =>
  StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 10,
      justifyContent: isSideMenu ? 'flex-start' : 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    content: {
      backgroundColor: theme.background.page,
      overflow: 'hidden',
      paddingHorizontal: spacing.M,
      paddingBottom: spacing.M,
      ...(isSideMenu
        ? {
            flex: 1,
            marginLeft: '45%',
            borderTopLeftRadius: radius.M,
            borderBottomLeftRadius: radius.M,
          }
        : {
            width: '100%',
            maxHeight: '95%',
            borderTopLeftRadius: radius.M,
            borderTopRightRadius: radius.M,
            paddingTop: spacing.M,
            marginTop: spacing.M,
          }),
    },
    closeButton: {
      backgroundColor: theme.background.primary,
      alignSelf: 'flex-end',
      marginTop: spacing.S,
    },
    contentWithPadding: {
      paddingTop: spacing.M,
    },
  });

const popupHandleStyles = (theme: Theme) =>
  StyleSheet.create({
    handleArea: {
      alignItems: 'center',
      paddingTop: spacing.S,
      paddingBottom: spacing.S,
    },
    handle: {
      width: 56,
      height: 5,
      borderRadius: radius.rounded,
      backgroundColor: theme.background.secondary,
    },
  });
