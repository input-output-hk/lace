import type {
  PressableStateCallbackType,
  StyleProp,
  ViewStyle,
} from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Icon, BlurView, Text, Row, Column } from '..';
import { radius, spacing, useTheme } from '../../../design-tokens';
import { getShadowStyle } from '../../../design-tokens/tokens/shadows';
import {
  getAndroidRipple,
  getIsWideLayout,
  hexToRgba,
  isWeb,
} from '../../util';

import type { IconName } from '..';
import type { Theme } from '../../../design-tokens';

const getTestId = (
  testID: string | undefined,
  suffix: string,
  fallback: string,
) => (testID ? `${testID}-${suffix}` : fallback);

const getIconColor = (theme: Theme, isCritical?: boolean) =>
  isCritical ? theme.data.negative : theme.text.primary;

const getContainerStyle = (
  styles: ReturnType<typeof getStyles>,
  isCritical?: boolean,
) => [styles.container, isCritical && styles.critical].filter(Boolean);

const getIconWrapper = ({
  isShielded,
  iconWrapperStyle,
  styles,
}: {
  isShielded?: boolean;
  iconWrapperStyle?: StyleProp<ViewStyle>;
  styles: ReturnType<typeof getStyles>;
}) => {
  if (isShielded) return styles.shieldedWrapper;
  return iconWrapperStyle ?? styles.walletIconWrapper;
};

const renderShield = ({
  isShielded,
  theme,
  styles,
}: {
  isShielded?: boolean;
  theme: Theme;
  styles: ReturnType<typeof getStyles>;
}) => {
  if (!isShielded) return null;
  return (
    <View style={styles.shield}>
      <Icon
        name="Shield"
        size={12}
        color={theme.brand.support}
        testID="shield-icon"
      />
    </View>
  );
};

const renderRightNode = (rightNode?: React.ReactNode): React.ReactNode =>
  rightNode ?? null;

const renderDescription = ({
  description,
  styles,
  testID,
}: {
  description?: string;
  styles: ReturnType<typeof getStyles>;
  testID?: string;
}) => {
  if (!description) return null;
  return (
    <Text.XS
      variant="secondary"
      style={styles.wrapText}
      testID={getTestId(testID, 'description', 'settings-card-description')}>
      {description}
    </Text.XS>
  );
};

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
    if (pressed) return styles.webInteractive;
    if (hovered) return styles.webInteractive;
    return undefined;
  }
  if (pressed) return styles.pressedMobile;
  return undefined;
};

interface SettingsCardProps {
  title: string;
  description?: string;
  isWalletSettingsPage?: boolean;
  rightNode?: React.ReactNode;
  quickActions?: {
    onCardPress?: () => void;
  };
  isCritical?: boolean;
  isShielded?: boolean;
  iconName?: IconName;
  testID?: string;
  iconWrapperStyle?: StyleProp<ViewStyle>;
}

export const SettingsCard = ({
  title,
  description,
  isWalletSettingsPage,
  rightNode,
  quickActions,
  isCritical,
  isShielded,
  iconName = 'Wallet',
  testID,
  iconWrapperStyle,
}: SettingsCardProps) => {
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { t } = useTranslation();

  const isWideLayout = getIsWideLayout(windowWidth);

  const styles = useMemo(
    () => getStyles(theme, isWideLayout),
    [theme, isWideLayout],
  );

  const isPressableDisabled = !quickActions?.onCardPress;
  const [isHovered, setIsHovered] = useState(false);

  const androidRipple = useMemo(() => {
    return getAndroidRipple({ isDisabled: isPressableDisabled, theme });
  }, [isPressableDisabled, theme]);

  const containerStyle = useMemo(() => {
    return getContainerStyle(styles, isCritical);
  }, [isCritical, styles]);

  const iconStyle = useMemo(() => {
    return getIconWrapper({ isShielded, iconWrapperStyle, styles });
  }, [iconWrapperStyle, isShielded, styles]);

  const pressableStyle: (
    state: PressableStateCallbackType,
  ) => StyleProp<ViewStyle> = useCallback(
    state => {
      const { pressed: isPressed } = state;
      const shouldShowHoveredStyle = isHovered && !isPressableDisabled;
      return [
        styles.pressable,
        isCritical ? styles.criticalPressable : undefined,
        getPressableInteractionStyle({
          styles,
          isDisabled: isPressableDisabled,
          pressed: isPressed,
          hovered: shouldShowHoveredStyle,
        }),
      ].filter(Boolean);
    },
    [isCritical, isHovered, isPressableDisabled, styles],
  );

  const handleHoverIn = useCallback(() => {
    if (!isPressableDisabled) setIsHovered(true);
  }, [isPressableDisabled]);

  const handleHoverOut = useCallback(() => {
    setIsHovered(false);
  }, []);

  const renderIcon = useCallback(() => {
    return (
      <Icon name={iconName} size={24} color={getIconColor(theme, isCritical)} />
    );
  }, [isCritical, iconName, theme]);

  const renderEyebrow = useCallback(() => {
    return (
      <Row
        alignItems="center"
        testID="wallet-settings-recovery-phrase-critical-eyebrow">
        <Text.XS variant="secondary">
          {t('v2.wallet-settings.action-required')}
        </Text.XS>
      </Row>
    );
  }, [t]);

  return (
    <Pressable
      style={pressableStyle}
      onPress={quickActions?.onCardPress}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      disabled={isPressableDisabled}
      testID={testID}
      android_ripple={androidRipple}>
      <BlurView style={containerStyle}>
        <Row
          alignItems="center"
          style={styles.contentWrapper}
          justifyContent="space-between">
          <Row alignItems="center" style={styles.content}>
            <View
              style={iconStyle}
              testID={getTestId(testID, 'icon', 'settings-card-icon')}>
              {renderShield({ isShielded, theme, styles })}
              {renderIcon()}
            </View>
            <Column style={styles.descriptionWrapper}>
              {isWalletSettingsPage && renderEyebrow()}
              <Text.M
                testID={getTestId(testID, 'title', 'settings-card-title')}>
                {title}
              </Text.M>
              {renderDescription({
                description,
                styles,
                testID,
              })}
            </Column>
          </Row>
          {renderRightNode(rightNode)}
        </Row>
      </BlurView>
    </Pressable>
  );
};

const getStyles = (theme: Theme, isWideLayout: boolean) => {
  return StyleSheet.create({
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
    },
    criticalPressable: {
      borderWidth: 1,
      borderColor: hexToRgba(theme.data.negative, 0.35),
      backgroundColor: hexToRgba(theme.data.negative, 0.08),
    },
    webInteractive: isWeb ? getShadowStyle({ theme, variant: 'inset' }) : {},
    pressedMobile: {
      opacity: 0.8,
      transform: [{ scale: 0.99 }],
    },
    contentWrapper: {
      padding: spacing.M,
      gap: spacing.M,
      width: '100%',
      borderRadius: radius.M,
    },
    content: {
      flex: 1,
      flexWrap: 'nowrap',
      gap: spacing.M,
      minWidth: 0,
    },
    shieldedWrapper: {
      borderWidth: 3,
      borderRadius: radius.XS,
      borderColor: theme.brand.support,
      padding: spacing.S,
    },
    shield: {
      position: 'absolute',
      top: 1,
      right: 1,
    },
    critical: {
      backgroundColor: 'transparent',
    },
    descriptionWrapper: {
      flexShrink: 1,
      gap: spacing.XS,
    },
    wrapText: {
      width: '100%',
      flexShrink: 1,
    },
    walletIconWrapper: {
      padding: spacing.S,
      borderRadius: radius.XS,
      boxShadow: `-1px -0.5px ${theme.extra.shadowInnerStrong}`,
      borderWidth: 0.5,
      borderColor: theme.extra.shadowInnerStrong,
    },
  });
};
