import type { ReactNode, Ref } from 'react';
import type { ScrollViewProps } from 'react-native';

import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import noop from 'lodash/noop';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Keyboard, StyleSheet, useWindowDimensions, View } from 'react-native';

import { radius, spacing, useTheme } from '../../../design-tokens';
import { Icon, IconButton } from '../../atoms';
import { isAndroid, isAndroid15Plus, isWeb } from '../../util';

import { useScrollEventsHandlers } from './useScrollEventsHandlers';

import type { Theme } from '../../../design-tokens';
import type {
  BottomSheetProps,
  BottomSheetScrollableProps,
  BottomSheetScrollViewMethods,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { AnimatedProps } from 'react-native-reanimated';
export interface Sheet extends BottomSheet {
  isOpen: boolean;
}
interface SheetProps extends BottomSheetProps {
  enableDynamicSizing: boolean;
  initialIndex: number | undefined;
  enableBackdrop?: boolean;
  /**
   * When false, user cannot close the sheet by panning down. Default true.
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
  sheetRef?: React.RefObject<Sheet | null>;
  closeSheet?: () => void;
}

export type BottomSheetScrollViewProps = BottomSheetScrollableProps &
  Omit<
    AnimatedProps<ScrollViewProps>,
    'decelerationRate' | 'scrollEventThrottle'
  > & {
    ref?: Ref<BottomSheetScrollViewMethods>;
    children: ReactNode | ReactNode[];
  };

const SheetBase = ({
  children,
  enableDynamicSizing,
  enableBackdrop = true,
  enablePanDownToClose = true,
  enableBackdropClose = true,
  onCloseRequest,
  initialIndex,
  onClose = noop,
  sheetRef,
  closeSheet = noop,
  ...restProps
}: SheetProps) => {
  const { theme, isSideMenu } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const styles = useMemo(
    () => getStyles({ theme, isSideMenu }),
    [theme, isSideMenu],
  );

  const androidKeyboardInputMode = useMemo(
    () => (isSideMenu || isAndroid15Plus ? 'adjustPan' : 'adjustResize'),
    [isSideMenu, isAndroid15Plus],
  );
  const keyboardBehavior = useMemo(
    () =>
      isAndroid ? (isAndroid15Plus ? 'interactive' : 'extend') : 'interactive',
    [isAndroid, isAndroid15Plus],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => {
      if (!enableBackdrop) return null;
      return (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior={enableBackdropClose ? 'close' : 'none'}
        />
      );
    },
    [enableBackdrop, enableBackdropClose],
  );

  const onCloseCallback = useCallback(() => {
    onClose();
  }, [onClose]);

  // Track actual sheet state via onChange to keep isOpen in sync
  // This is necessary because the sheet can be closed via gestures.
  const onChangeCallback = useCallback(
    (index: number) => {
      if (sheetRef?.current) {
        // Sheet is open when index >= 0, closed when index is -1
        sheetRef.current.isOpen = index >= 0;
      }
    },
    [sheetRef],
  );

  const shouldShowCloseButton = useMemo(() => {
    if (!isSideMenu) return false;
    // If onCloseRequest exists, check if close is allowed
    if (onCloseRequest) {
      return onCloseRequest();
    }
    // Default to showing the button if no onCloseRequest is provided
    return true;
  }, [isSideMenu, onCloseRequest]);

  const handleClosePress = useCallback(() => {
    if (onCloseRequest && !onCloseRequest()) return;
    closeSheet();
  }, [closeSheet, onCloseRequest]);

  const snapPoints = useMemo(() => {
    if (isSideMenu) return ['100%'];
    // When dynamic sizing is disabled, we need snap points as fallback
    if (!enableDynamicSizing) return ['90%'];
    return undefined;
  }, [isSideMenu, enableDynamicSizing]);

  const isFixedHeightSheet = !isWeb && !enableDynamicSizing && !isSideMenu;

  const keyboardBlurBehavior = useMemo(
    () => (isFixedHeightSheet ? 'none' : 'restore'),
    [isFixedHeightSheet],
  );

  useEffect(() => {
    if (!isFixedHeightSheet || !sheetRef) return;
    const onKeyboardDidHide = () => {
      sheetRef.current?.snapToIndex(0);
    };
    const sub = Keyboard.addListener('keyboardDidHide', onKeyboardDidHide);
    return () => {
      sub.remove();
    };
  }, [isFixedHeightSheet, sheetRef]);

  return (
    <BottomSheet
      enableOverDrag={false}
      index={initialIndex}
      snapPoints={snapPoints}
      enableDynamicSizing={enableDynamicSizing}
      enablePanDownToClose={enablePanDownToClose}
      maxDynamicContentSize={windowHeight * 0.9}
      backdropComponent={renderBackdrop}
      detached={isSideMenu}
      style={styles.sheet}
      onChange={onChangeCallback}
      onClose={onCloseCallback}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handleIndicator}
      handleStyle={styles.handle}
      android_keyboardInputMode={androidKeyboardInputMode}
      keyboardBehavior={keyboardBehavior}
      keyboardBlurBehavior={keyboardBlurBehavior}
      ref={sheetRef}
      {...restProps}>
      {shouldShowCloseButton ? (
        <IconButton.Static
          icon={<Icon name="Cancel" size={24} />}
          onPress={handleClosePress}
          containerStyle={styles.closeButton}
          testID={'side-sheet-close-button'}
        />
      ) : (
        isSideMenu && <View style={styles.contentWithPadding} />
      )}
      {children}
    </BottomSheet>
  );
};

const Scroll = (props: BottomSheetScrollViewProps) => {
  const {
    children,
    keyboardShouldPersistTaps = 'handled',
    ...restProps
  } = props;

  // Keep sheet content above the keyboard on Android and iOS.
  return (
    <>
      <BottomSheetScrollView
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        scrollEventsHandlersHook={useScrollEventsHandlers}
        {...restProps}>
        {children}
      </BottomSheetScrollView>
    </>
  );
};

export const Sheet = Object.assign(SheetBase, {
  Scroll,
});

const getStyles = ({
  theme,
  isSideMenu,
}: {
  theme: Theme;
  isSideMenu: boolean;
}) =>
  StyleSheet.create({
    sheet: isSideMenu
      ? {
          backgroundColor: theme.background.page,
          marginLeft: '45%',
          paddingHorizontal: spacing.M,
          borderRadius: radius.XL,
        }
      : {
          paddingBottom: 0,
          marginBottom: spacing.XXL,
          paddingHorizontal: spacing.M,
        },
    background: { backgroundColor: theme.background.page },
    handleIndicator: {
      display: isSideMenu ? 'none' : 'flex',
      backgroundColor: theme.background.secondary,
      width: '30%',
    },
    handle: {
      paddingVertical: spacing.L,
    },
    closeButton: {
      backgroundColor: theme.background.primary,
      alignSelf: 'flex-end',
    },
    contentWithPadding: {
      paddingTop: spacing.M,
    },
  });
