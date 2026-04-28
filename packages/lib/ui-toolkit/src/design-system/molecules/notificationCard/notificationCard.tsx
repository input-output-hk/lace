import type {
  PressableStateCallbackType,
  StyleProp,
  ViewStyle,
} from 'react-native';

import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { radius, spacing, useTheme } from '../../../design-tokens';
import { getShadowStyle } from '../../../design-tokens/tokens/shadows';
import { BlurView, Icon, Row, Text } from '../../atoms';
import { getAndroidRipple, getIsWideLayout, isWeb } from '../../util';

import type { Theme } from '../../../design-tokens';
import type { IconName } from '../../atoms';

const getPressableInteractionStyle = ({
  styles,
  isDisabled,
  pressed,
  hovered,
}: {
  styles: ReturnType<typeof getStyles>;
  isDisabled: boolean;
  pressed: boolean;
  hovered: boolean;
}) => {
  if (isDisabled) return undefined;
  if (isWeb) {
    if (pressed || hovered) return styles.webInteractive;
    return undefined;
  }
  if (pressed) return styles.pressedMobile;
  return undefined;
};

export type NotificationCardProps = {
  headerTitle: string;
  headerIcon: IconName;
  bodyTitle: string;
  isRead?: boolean;
  onPress?: () => void;
  testID?: string;
};

export const NotificationCard = ({
  headerTitle,
  headerIcon,
  bodyTitle,
  isRead = false,
  onPress,
  testID = 'notification-card',
}: NotificationCardProps) => {
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isWideLayout = getIsWideLayout(windowWidth);
  const styles = useMemo(
    () => getStyles(theme, isWideLayout),
    [theme, isWideLayout],
  );

  const isPressableDisabled = !onPress;
  const [isHovered, setIsHovered] = useState(false);

  const androidRipple = useMemo(
    () => getAndroidRipple({ isDisabled: isPressableDisabled, theme }),
    [isPressableDisabled, theme],
  );

  const pressableStyle: (
    state: PressableStateCallbackType,
  ) => StyleProp<ViewStyle> = useCallback(
    ({ pressed: isPressed }) => {
      const shouldShowHoveredStyle = isHovered && !isPressableDisabled;
      return [
        styles.pressable,
        getPressableInteractionStyle({
          styles,
          isDisabled: isPressableDisabled,
          pressed: isPressed,
          hovered: shouldShowHoveredStyle,
        }),
      ].filter(Boolean);
    },
    [isHovered, isPressableDisabled, styles],
  );

  const handleHoverIn = useCallback(() => {
    if (!isPressableDisabled) setIsHovered(true);
  }, [isPressableDisabled]);

  const handleHoverOut = useCallback(() => {
    setIsHovered(false);
  }, []);

  const contentStyle = useMemo(() => {
    return [styles.card, styles.content, isRead && styles.contentRead];
  }, [isRead, styles]);

  return (
    <Pressable
      style={pressableStyle}
      onPress={onPress}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      disabled={isPressableDisabled}
      testID={testID}
      android_ripple={androidRipple}>
      <BlurView style={styles.container}>
        <View style={contentStyle}>
          <Row
            alignItems="center"
            gap={spacing.XS}
            style={styles.headerRow}
            testID={`${testID}-header`}>
            <Icon
              name={headerIcon}
              size={16}
              color={theme.text.secondary}
              testID={`${testID}-icon`}
            />
            <Text.XS
              variant="secondary"
              style={styles.wrapText}
              testID={`${testID}-header-title`}>
              {headerTitle}
            </Text.XS>
          </Row>
          <Text.M
            variant="primary"
            style={styles.wrapText}
            testID={`${testID}-body-title`}>
            {bodyTitle}
          </Text.M>
        </View>
      </BlurView>
    </Pressable>
  );
};

const getStyles = (theme: Theme, isWideLayout: boolean) =>
  StyleSheet.create({
    container: {
      justifyContent: 'center',
      flex: 1,
      borderRadius: radius.M,
      backgroundColor: theme.background.primary,
    },
    pressable: {
      overflow: 'hidden',
      width: isWideLayout ? '60%' : '100%',
      borderRadius: radius.M,
      borderWidth: 0.5,
      borderColor: theme.extra.shadowInnerStrong,
      minHeight: 90,
      justifyContent: 'center',
      marginBottom: spacing.S,
    },
    webInteractive: isWeb ? getShadowStyle({ theme, variant: 'inset' }) : {},
    pressedMobile: {
      opacity: 0.8,
      transform: [{ scale: 0.99 }],
    },
    card: {
      borderRadius: radius.M,
      padding: spacing.M,
    },
    content: {
      flex: 1,
      minWidth: 0,
      gap: spacing.S,
    },
    headerRow: {
      flexShrink: 1,
      minWidth: 0,
      flexWrap: 'nowrap',
    },
    wrapText: {
      flexShrink: 1,
    },
    contentRead: {
      opacity: 0.4,
    },
  });
