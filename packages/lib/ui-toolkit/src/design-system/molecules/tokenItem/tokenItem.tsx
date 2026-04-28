import { useTranslation } from '@lace-contract/i18n';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { radius, spacing, useTheme } from '../../../design-tokens';
import {
  Icon,
  Avatar,
  BlurView,
  Text,
  RadioButton,
  CustomTag,
} from '../../atoms';
import { getAssetImageUrl } from '../../util';

import type { Theme } from '../../../design-tokens';
import type { IconName } from '../../atoms/icons/Icon';

export type TokenItemVariant = 'primary' | 'secondary';

export type TokenItemProps = {
  /** When true, show shielded state only on the avatar (no "Shielded" text tag). Use in lists (e.g. portfolio, assets picker). */
  shieldedOnAvatarOnly?: boolean;
  logo?: string;
  name: string;
  balance: string;
  balancePendingText?: string;
  currency: string;
  rate?: string;
  rateLabelOverride?: string;
  conversion?: string;
  shielded?: boolean;
  unnamed?: boolean;
  chainSymbol?: IconName;
  onPress?: () => void;
  isChecked?: boolean;
  onRadioValueChange?: () => void;
  isExpanded?: boolean;
  isLoading?: boolean;
  isPriceStale?: boolean;
  isDisabled?: boolean;
  testID?: string;
  showCaretIcon?: boolean;
  variant?: TokenItemVariant;
};

const defaultSize = 48;

export const TokenItem = ({
  shieldedOnAvatarOnly,
  logo,
  name,
  balance,
  balancePendingText,
  currency,
  rate,
  rateLabelOverride,
  conversion,
  shielded,
  unnamed,
  chainSymbol,
  onPress,
  onRadioValueChange,
  isChecked,
  isExpanded,
  isPriceStale,
  isDisabled,
  testID,
  showCaretIcon,
  variant = 'primary',
}: TokenItemProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const styles = getStyles(theme, { isExpanded, variant, isDisabled });

  const rotationValue = useSharedValue(isExpanded ? 180 : 0);

  useEffect(() => {
    rotationValue.value = withTiming(isExpanded ? 180 : 0, {
      duration: 300,
    });
  }, [isExpanded, rotationValue]);

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: `${rotationValue.value}deg`,
        },
      ],
    };
  }, [rotationValue]);

  const avatarContent = useMemo(
    () => ({
      size: defaultSize,
      shape: 'rounded' as const,
      content: {
        ...(logo && { img: { uri: getAssetImageUrl(logo) } }),
        fallback: name,
      },
      isShielded: shieldedOnAvatarOnly && shielded,
      chainSymbol,
    }),
    [logo, name, shielded, chainSymbol, shieldedOnAvatarOnly],
  );

  const { hasRate, hasConversion, rateLabel } = useMemo(() => {
    let rateLabel: string | undefined = rateLabelOverride;
    if (!rateLabel && !!rate) {
      rateLabel = `1 = ${rate} ${currency}`;
    }

    return {
      hasRate: !!rateLabel,
      hasConversion: !!conversion,
      rateLabel,
    };
  }, [conversion, currency, rate, rateLabelOverride]);

  const handlePress = isDisabled ? undefined : onRadioValueChange ?? onPress;

  let secondaryAmountSlot = null;
  if (balancePendingText) {
    secondaryAmountSlot = (
      <View>
        <Text.XS
          style={styles.balancePending}
          testID={`${testID}-pending-balance`}>
          {balancePendingText}
        </Text.XS>
      </View>
    );
  } else if (hasConversion) {
    secondaryAmountSlot = (
      <View style={styles.conversionRow}>
        {isPriceStale && (
          <Icon
            name="AlertTriangle"
            size={12}
            color={theme.brand.orange}
            testID={testID ? `${testID}-price-stale-warning` : undefined}
          />
        )}
        <Text.XS variant="secondary" testID={`${testID}-conversion`}>
          {conversion} {currency}
        </Text.XS>
      </View>
    );
  }

  return (
    <Pressable onPress={handlePress} disabled={isDisabled || !handlePress}>
      <BlurView style={styles.container} testID={testID}>
        {!!onRadioValueChange && (
          <View pointerEvents="none">
            <RadioButton
              isChecked={isChecked}
              onRadioValueChange={onRadioValueChange}
              testID={`${testID}-radio-button`}
            />
          </View>
        )}
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarContainer}>
            <Avatar {...avatarContent} testID={`${testID}-avatar`} />
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text.M numberOfLines={1} testID={`${testID}-name`}>
            {name}
          </Text.M>
          {unnamed ? (
            <Text.XS variant="secondary" testID={`${testID}-name-token-label`}>
              {t(
                'midnight.tokens-page.token-list-item-customisation.name-token',
              )}
            </Text.XS>
          ) : !shieldedOnAvatarOnly && shielded ? (
            <View style={styles.shieldedTagWrapper}>
              <CustomTag
                size="S"
                color="secondary"
                backgroundType="semiTransparent"
                icon={
                  <Icon
                    name="Shield"
                    size={15}
                    color={theme.brand.white}
                    variant="stroke"
                  />
                }
                label={t(
                  'midnight.tokens-page.token-list-item-customisation.shielded-pill',
                )}
                testID={`${testID}-shielded-tag`}
              />
            </View>
          ) : hasRate && rateLabel ? (
            <Text.XS variant="secondary" testID={`${testID}-rate-label`}>
              {rateLabel}
            </Text.XS>
          ) : null}
        </View>

        <View style={styles.amountContainer}>
          <Text.M numberOfLines={1} testID={`${testID}-balance`}>
            {balance}
          </Text.M>
          {secondaryAmountSlot}
        </View>
        {showCaretIcon && (
          <View style={styles.chevronContainer}>
            <Animated.View style={animatedIconStyle}>
              <Icon name="CaretDown" />
            </Animated.View>
          </View>
        )}
      </BlurView>
    </Pressable>
  );
};

const getStyles = (
  theme: Theme,
  {
    isExpanded,
    variant = 'primary',
    isDisabled,
  }: {
    isExpanded?: boolean;
    variant?: TokenItemVariant;
    isDisabled?: boolean;
  },
) => {
  const backgroundColor =
    variant === 'secondary'
      ? theme.background.secondary
      : theme.background.primary;

  return StyleSheet.create({
    container: {
      backgroundColor,
      borderRadius: isExpanded ? 0 : radius.M,
      borderWidth: 1,
      borderColor: theme.background.secondary,
      padding: spacing.M,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      overflow: 'hidden',
      gap: spacing.S,
      opacity: isDisabled ? 0.4 : 1,
    },
    avatarWrapper: {
      marginRight: spacing.S,
    },
    avatarContainer: {
      borderRadius: defaultSize,
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    textContainer: {
      marginLeft: 2,
      flex: 1,
      flexShrink: 0,
      minWidth: 80,
    },
    shieldedTagWrapper: {
      alignSelf: 'flex-start',
    },
    amountContainer: {
      alignItems: 'flex-end',
      flexShrink: 1,
      maxWidth: '50%',
    },
    balancePending: {
      color: theme.data.positive,
    },
    conversionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.XS,
    },
    chevronContainer: {
      marginLeft: spacing.S,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
};
