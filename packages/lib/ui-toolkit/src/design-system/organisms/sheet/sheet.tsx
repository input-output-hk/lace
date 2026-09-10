import type { ReactNode, Ref, RefObject } from 'react';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewProps,
  StyleProp,
  ViewProps,
  ViewStyle,
} from 'react-native';

import { useTrueSheet } from '@lodev09/react-native-true-sheet';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useTheme } from '../../../design-tokens';
import {
  Avatar,
  Button,
  Column,
  Divider,
  Icon,
  IconButton,
  Row,
  Text,
} from '../../atoms';
import { isWeb } from '../../util';
import { getAssetImageUrl } from '../../util';

import { SheetSubmitProvider } from './sheetSubmit';

import type { Theme } from '../../../design-tokens';
import type { IconName } from '../../atoms';
import type { ButtonVariant } from '../../atoms/button/button.types';
import type { EdgeInsets } from 'react-native-safe-area-context';

export const footerHeight = {
  horizontal: isWeb ? 80 : 100,
  vertical: isWeb ? 115 : 200,
  titleRow: 70,
};
const AVATAR_SIZE = 20;
const isIPad = Platform.OS === 'ios' && Platform.isPad;

type SheetScrollProps = Omit<ScrollViewProps, 'ref'> & {
  ref?: Ref<ScrollView>;
  children: ReactNode | ReactNode[];
  /** Pads scroll content by keyboard height to keep inputs visible. Enable only when TrueSheet can't auto-manage the scroll (nested deep under a navigator). Default `false`. */
  keyboardAware?: boolean;
};

type HeaderAvatar = {
  metadata: {
    image?: string;
    fallback?: string;
  };
};

interface SheetHeaderProps {
  title: string;
  leftIcon?: IconName;
  leftIconOnPress?: () => void;
  subtitle?: string;
  testID?: string;
  headerIcon?: IconName;
  headerAvatar?: HeaderAvatar;
  showDivider?: boolean;
  height?: number;
  handleClose?: () => void;
}

export interface ButtonConfig {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  preIconName?: IconName;
  iconColor?: string;
  testID?: string;
}

interface SheetFooterProps {
  primaryButton?: ButtonConfig;
  secondaryButton?: ButtonConfig;
  primaryVariant?: 'critical' | 'primary';
  vertical?: boolean;
  showDivider?: boolean;
  titleRow?: ReactNode;
  testID?: string;
}

const SheetContainer = ({ children, style, ...props }: ViewProps) => {
  const containerStyle: StyleProp<ViewStyle> = useMemo(
    () => ({
      padding: spacing.M,
      ...(!!style && { style }),
    }),
    [style],
  );

  return (
    <View {...props} style={containerStyle}>
      {children}
    </View>
  );
};

const Header = ({
  title,
  leftIcon = 'CaretLeft',
  leftIconOnPress,
  handleClose,
  subtitle,
  headerIcon,
  headerAvatar,
  showDivider = true,
  testID = 'sheet-header',
}: SheetHeaderProps) => {
  const { theme } = useTheme();

  const { dismissAll } = useTrueSheet();

  const headerStyles = getHeaderStyles({ theme });

  const onClosePress = useCallback(() => {
    if (handleClose) {
      handleClose();
    } else {
      void dismissAll();
    }
  }, [dismissAll, handleClose]);

  const avatarContent = useMemo(() => {
    const imageUrl = getAssetImageUrl(headerAvatar?.metadata?.image);

    return {
      fallback: headerAvatar?.metadata?.fallback,
      ...(imageUrl && { img: { uri: imageUrl } }),
    };
  }, [headerAvatar]);

  return (
    // Local gesture root: TrueSheet's native header slot sits outside the
    // app-root GestureHandlerRootView on Android, so the back button's
    // gesture-handler Pressable gets no taps without a root in its subtree.
    <GestureHandlerRootView testID={testID} style={styles.headerContainer}>
      <Row alignItems="center" justifyContent="center" style={styles.headerRow}>
        {leftIconOnPress && (
          <IconButton.Static
            icon={<Icon name={leftIcon} size={24} />}
            onPress={leftIconOnPress}
            containerStyle={styles.leftIcon}
            testID={`${testID}-left-icon`}
          />
        )}
        <Row
          alignItems="center"
          justifyContent="center"
          style={styles.titleContainer}
          gap={spacing.S}>
          {!!headerIcon && <Icon name={headerIcon} />}
          {!!headerAvatar && (
            <Avatar
              size={AVATAR_SIZE}
              shape="rounded"
              content={avatarContent}
            />
          )}
          <Text.S numberOfLines={1} align="center" testID={`${testID}-title`}>
            {title}
          </Text.S>
        </Row>
        {isWeb && (
          <IconButton.Static
            icon={<Icon name="Cancel" size={20} />}
            onPress={onClosePress}
            containerStyle={headerStyles.closeButton}
            testID={'side-sheet-close-button'}
          />
        )}
      </Row>
      {showDivider && (
        <View style={styles.divider}>
          <Divider />
        </View>
      )}
      {subtitle && (
        <Text.S
          align="center"
          style={styles.subtitle}
          testID={`${testID}-subtitle`}>
          {subtitle}
        </Text.S>
      )}
    </GestureHandlerRootView>
  );
};

const getFooterStyles = ({
  insets,
  theme,
}: {
  insets: EdgeInsets;
  theme: Theme;
}) =>
  StyleSheet.create({
    footer: {
      // On iPad, the sheet is displayed as a floating modal, so bottom padding is not needed.
      paddingBottom: spacing.S + (isIPad ? 0 : insets.bottom),
      paddingHorizontal: spacing.M,
      backgroundColor: theme.background.page,
    },
  });

const getHeaderStyles = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    closeButton: {
      backgroundColor: theme.background.primary,
      position: 'absolute',
      right: spacing.M,
      zIndex: 1,
    },
  });

const Footer = ({
  primaryButton,
  secondaryButton,
  primaryVariant = 'primary',
  vertical = false,
  showDivider = true,
  titleRow,
  testID = 'sheet-footer',
}: SheetFooterProps) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const footerStyles = getFooterStyles({ insets, theme });

  const PrimaryButtonComponent =
    primaryVariant === 'critical' ? Button.Critical : Button.Primary;
  const SecondaryButtonComponent = Button.Secondary;

  const ButtonsContainer = vertical ? Column : Row;

  return (
    <Column style={footerStyles.footer} gap={spacing.S} testID={testID}>
      {showDivider && <Divider />}
      {titleRow}
      <ButtonsContainer
        alignItems={vertical ? 'stretch' : 'center'}
        gap={spacing.S}>
        {!vertical && secondaryButton && (
          <SecondaryButtonComponent
            flex={1}
            label={secondaryButton.label}
            onPress={secondaryButton.onPress}
            loading={secondaryButton.loading}
            disabled={secondaryButton.disabled}
            preIconName={secondaryButton.preIconName}
            iconColor={secondaryButton.iconColor}
            testID={secondaryButton.testID}
          />
        )}
        {primaryButton && (
          <PrimaryButtonComponent
            flex={vertical ? undefined : 1}
            label={primaryButton.label}
            onPress={primaryButton.onPress}
            loading={primaryButton.loading}
            disabled={primaryButton.disabled}
            preIconName={primaryButton.preIconName}
            iconColor={primaryButton.iconColor}
            testID={primaryButton.testID}
          />
        )}
        {vertical && secondaryButton && (
          <SecondaryButtonComponent
            label={secondaryButton.label}
            onPress={secondaryButton.onPress}
            loading={secondaryButton.loading}
            disabled={secondaryButton.disabled}
            preIconName={secondaryButton.preIconName}
            iconColor={secondaryButton.iconColor}
            testID={secondaryButton.testID}
          />
        )}
      </ButtonsContainer>
    </Column>
  );
};

// Breathing room kept between the focused input and the footer/keyboard.
const KEYBOARD_SCROLL_MARGIN = spacing.L;

// While `enabled`, tracks keyboard height (for bottom padding) and scrolls the
// focused input above the keyboard + floating footer. No listeners while disabled.
const useKeyboardAwareScroll = (
  enabled: boolean,
  scrollRef: RefObject<ScrollView | null>,
  scrollOffsetY: RefObject<number>,
): number => {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, event => {
      const keyboardTop = event.endCoordinates?.screenY;
      setHeight(event.endCoordinates?.height ?? 0);
      if (keyboardTop === undefined) return;

      // Defer a frame so the bottom padding applies first, leaving room to scroll into.
      requestAnimationFrame(() => {
        const focused = TextInput.State.currentlyFocusedInput();
        if (!focused) return;

        // measureInWindow's callback arity (x, y, width, height) is fixed by RN.
        // eslint-disable-next-line max-params
        focused.measureInWindow((_x, y, _width, inputHeight) => {
          // The footer floats above the keyboard, so the input must clear both.
          const overlap =
            y +
            inputHeight +
            KEYBOARD_SCROLL_MARGIN +
            footerHeight.vertical -
            keyboardTop;
          if (overlap > 0) {
            scrollRef.current?.scrollTo({
              y: scrollOffsetY.current + overlap,
              animated: true,
            });
          }
        });
      });
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [enabled, scrollRef, scrollOffsetY]);

  return enabled ? height : 0;
};

const Scroll = (props: SheetScrollProps) => {
  const {
    children,
    ref,
    contentContainerStyle,
    keyboardAware: isKeyboardAware = false,
    onScroll,
    // Default to 'handled' so a tap on an in-scroll control while an input is
    // focused activates the control instead of being swallowed to dismiss the
    // keyboard (preserves the behavior the removed web BottomSheetScrollView had).
    keyboardShouldPersistTaps = 'handled',
    ...restProps
  } = props;

  const scrollRef = useRef<ScrollView | null>(null);
  const scrollOffsetY = useRef(0);

  // Merge the forwarded ref with our internal one (used by the auto-scroll).
  const setScrollRef = useCallback(
    (node: ScrollView | null) => {
      scrollRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetY.current = event.nativeEvent.contentOffset.y;
      onScroll?.(event);
    },
    [onScroll],
  );

  const keyboardInset = useKeyboardAwareScroll(
    isKeyboardAware,
    scrollRef,
    scrollOffsetY,
  );

  const mergedContentContainerStyle = useMemo(() => {
    const base: StyleProp<ViewStyle> = [
      styles.scrollContentContainer,
      contentContainerStyle,
    ];
    if (keyboardInset <= 0) return base;

    // Add keyboard inset + footer height on top of the existing bottom padding
    // (paddingBottom > paddingVertical > padding), not overwriting it.
    const flattened = StyleSheet.flatten(base);
    const basePaddingBottom =
      flattened.paddingBottom ??
      flattened.paddingVertical ??
      flattened.padding ??
      0;

    return [
      base,
      {
        paddingBottom:
          (typeof basePaddingBottom === 'number' ? basePaddingBottom : 0) +
          keyboardInset +
          footerHeight.vertical,
      },
    ];
  }, [contentContainerStyle, keyboardInset]);

  return (
    <ScrollView
      ref={setScrollRef}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      contentContainerStyle={mergedContentContainerStyle}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...restProps}>
      {children}
    </ScrollView>
  );
};

export const Sheet = Object.assign(SheetContainer, {
  Header,
  Footer,
  Scroll,
  SubmitProvider: SheetSubmitProvider,
});

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: spacing.L,
  },
  headerRow: {
    position: 'relative',
  },
  leftIcon: {
    backgroundColor: 'transparent',
    position: 'absolute',
    left: 0,
    zIndex: 1,
  },
  titleContainer: {
    flex: 1,
    marginVertical: spacing.S,
  },
  divider: {
    marginTop: spacing.M,
    marginHorizontal: spacing.M,
  },
  subtitle: {
    marginTop: spacing.M,
    marginHorizontal: spacing.M,
  },
  scrollContentContainer: {
    padding: spacing.M,
  },
});
