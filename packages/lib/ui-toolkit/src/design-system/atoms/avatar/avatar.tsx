import { Image } from 'expo-image';
import React, { useMemo } from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';

import { getIsDark, type IconName } from '../../../design-system';
import { useTheme, radius, spacing } from '../../../design-tokens';
import {
  getBorderRadius,
  getImageSource,
  getShieldIconPosition,
  getChainSymbolPosition,
} from '../../../utils/avatarUtils';
import { Beacon, Icon } from '../../atoms';

import { HexagonMask } from './hexagon-mask';

import type { Theme } from '../../../design-tokens';
import type {
  AvatarProps,
  AvatarStyleSheetProps,
} from '../../../utils/avatarUtils';

const ChainSymbol = ({
  chainSymbol,
  chainSymbolPosition,
  styles,
  theme,
}: {
  chainSymbol: IconName;
  chainSymbolPosition: { bottom: number; right: number };
  styles: ReturnType<typeof getStyles>;
  theme: Theme;
}) => (
  <View style={[styles.chainSymbol, chainSymbolPosition]}>
    <View style={styles.badgeWrapper}>
      <Beacon
        icon={
          <Icon name={chainSymbol} size={12} color={theme.icons.background} />
        }
        color="white"
        backgroundType="colored"
      />
    </View>
  </View>
);

export const Avatar = ({
  size = spacing.XXXXL,
  content,
  shape = 'squared',
  isShielded = false,
  chainSymbol,
  style,
  testID,
  ...props
}: AvatarProps) => {
  const { theme } = useTheme();

  const avatarStyles = getAvatarStyles({
    size,
    shape,
    isShielded,
    theme,
  });

  const shieldIconSize = 12;
  const beaconSize = spacing.M;

  const shieldIconPosition = getShieldIconPosition(shape, size, shieldIconSize);

  const chainSymbolPosition = useMemo(() => {
    if (!chainSymbol) return null;
    return getChainSymbolPosition(size, beaconSize);
  }, [chainSymbol, size, beaconSize]);

  const imageUri = getImageSource(content)?.uri;

  const shouldShowIcon = !imageUri && !content.fallback;

  const styles = getStyles(size, theme, shieldIconSize);

  const imgNotFoundDefaultIconSize = useMemo(() => {
    return size * 0.3 + 10;
  }, [size]);

  const avatarComponent =
    shape === 'hexagon' ? (
      <View style={styles.avatarOnly}>
        <HexagonMask
          size={size}
          imageUri={imageUri}
          fallbackText={content.fallback}
          backgroundColor={theme.background.tertiary}
          textColor={theme.text.primary}
          isShielded={isShielded}
          shieldColor={theme.brand.support}
          shouldShowIcon={shouldShowIcon}
        />
        {isShielded && (
          <View style={[styles.shieldIcon, shieldIconPosition]}>
            <Icon
              name="Shield"
              size={shieldIconSize}
              color={theme.brand.support}
              variant="solid"
            />
          </View>
        )}
        {chainSymbolPosition && (
          <ChainSymbol
            chainSymbol={chainSymbol as IconName}
            chainSymbolPosition={chainSymbolPosition}
            styles={styles}
            theme={theme}
          />
        )}
      </View>
    ) : (
      <View style={styles.avatarOnly}>
        <View style={avatarStyles.avatar}>
          {imageUri ? (
            <Image style={avatarStyles.image} source={{ uri: imageUri }} />
          ) : shouldShowIcon ? (
            <Icon name="ImageNotFound" size={imgNotFoundDefaultIconSize} />
          ) : (
            <RNText
              numberOfLines={1}
              style={[avatarStyles.text, { fontSize: size * 0.5 }]}>
              {content?.fallback?.slice(0, 2)}
            </RNText>
          )}
        </View>
        {isShielded && (
          <View style={[styles.shieldIcon, shieldIconPosition]}>
            <Icon
              name="Shield"
              size={shieldIconSize}
              color={theme.brand.support}
              variant="solid"
            />
          </View>
        )}
        {chainSymbolPosition && (
          <ChainSymbol
            chainSymbol={chainSymbol as IconName}
            chainSymbolPosition={chainSymbolPosition}
            styles={styles}
            theme={theme}
          />
        )}
      </View>
    );

  return (
    <View
      style={[styles.labelContainer, style]}
      testID={testID ? testID : 'avatar'}
      {...props}>
      {avatarComponent}
    </View>
  );
};

const getAvatarStyles = ({
  size,
  shape,
  isShielded = false,
  theme,
}: AvatarStyleSheetProps & { theme: Theme }) => {
  const borderRadius = getBorderRadius(size, shape);

  return StyleSheet.create({
    avatar: {
      height: size,
      width: size,
      borderRadius,
      backgroundColor:
        shape === 'hexagon' ? 'transparent' : theme.background.tertiary,
      justifyContent: 'center',
      alignContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      ...(isShielded &&
        shape !== 'hexagon' && {
          borderWidth: 3,
          borderColor: theme.brand.support,
          borderRadius,
        }),
    },
    image: {
      width: size,
      height: size,
    },
    text: {
      color: theme.text.primary,
    },
  });
};

const getStyles = (size: number, theme: Theme, shieldIconSize: number) => {
  const isDark = getIsDark(theme);
  const badgeBackgroundColor = isDark ? theme.brand.black : theme.brand.white;

  return StyleSheet.create({
    container: {
      position: 'relative',
    },
    avatarOnly: {
      position: 'relative',
    },
    hexagonContainer: {
      width: size,
      height: size,
      position: 'relative',
    },
    shieldIcon: {
      position: 'absolute',
      zIndex: 10,
      backgroundColor: theme.brand.white,
      borderRadius: (shieldIconSize + 6) / 2,
      width: shieldIconSize + 6,
      height: shieldIconSize + 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    chainSymbol: {
      position: 'absolute',
      zIndex: 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.brand.black,
      borderRadius: radius.rounded,
    },
    labelContainer: {
      position: 'relative',
    },
    labelOverlay: {
      position: 'absolute',
      bottom: spacing.XS,
      left: spacing.XS,
      right: spacing.XS,
      backgroundColor: theme.background.primary,
      borderRadius: radius.M,
      padding: spacing.XS,
      overflow: 'hidden',
    },
    badgeWrapper: {
      borderRadius: radius.rounded,
      backgroundColor: badgeBackgroundColor,
    },
  });
};
