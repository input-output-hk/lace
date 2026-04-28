import type { StyleProp, ViewStyle, ImageURISource } from 'react-native';

import React, { useCallback } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';

import { radius, spacing, useTheme } from '../../../design-tokens';
import { Avatar, BlurredLabel, BlurView, Icon, RadioButton } from '../../atoms';

import type { Theme } from '../../../design-tokens';
import type { ImageShape } from '../../../utils/avatarUtils';
import type { IconName } from '../../atoms';

type NFTItemProps = {
  image: ImageURISource;
  label?: string;
  size?: number;
  shape?: ImageShape;
  isShielded?: boolean;
  fileTypeIcon?: IconName;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onRadioValueChange?: () => void;
  radioValue?: string;
  testID?: string;
  fallback?: string;
};

export const NFTItem = ({
  image,
  label,
  size = 145,
  shape = 'squared',
  isShielded = false,
  fileTypeIcon,
  style,
  onPress,
  onRadioValueChange,
  radioValue,
  testID,
  fallback,
}: NFTItemProps) => {
  const { theme } = useTheme();
  const styles = getStyles(theme, size);
  const isSelectable = !!onRadioValueChange;
  const isChecked = radioValue === label;

  const handlePress = useCallback(() => {
    onRadioValueChange?.();
  }, [onRadioValueChange]);

  const content = (
    <>
      {isSelectable && (
        <View style={styles.radioWrapper} pointerEvents="none">
          <RadioButton
            onRadioValueChange={handlePress}
            style={styles.radioButton}
            showBorder={true}
            isChecked={isChecked}
            value={radioValue}
          />
        </View>
      )}
      <Avatar
        size={size}
        content={{ img: image, fallback }}
        shape={shape}
        isShielded={isShielded}
        style={styles.avatar}
      />
      {!!label && (
        <View style={styles.labelOverlay}>
          <BlurredLabel text={label} size="XS" />
        </View>
      )}
      {!!fileTypeIcon && !isShielded && (
        <BlurView style={styles.playIconOverlay}>
          <Icon name={fileTypeIcon} size={18} />
        </BlurView>
      )}
    </>
  );

  if (isSelectable) {
    return (
      <Pressable
        style={[styles.container, style]}
        testID={testID}
        onPress={handlePress}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isChecked }}>
        {content}
      </Pressable>
    );
  }

  if (onPress) {
    return (
      <Pressable
        style={[styles.container, style]}
        testID={testID}
        onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      {content}
    </View>
  );
};

const getStyles = (_theme: Theme, size: number) =>
  StyleSheet.create({
    container: {
      position: 'relative',
      width: size,
      height: size,
    },
    avatar: {
      width: size,
      height: size,
    },
    labelOverlay: {
      position: 'absolute',
      bottom: 3,
      left: 3,
      right: 3,
    },
    radioWrapper: {
      position: 'absolute',
      zIndex: 1,
      top: 8,
      left: 8,
    },
    radioButton: {
      backgroundColor: _theme.brand.lightGray,
    },
    playIconOverlay: {
      position: 'absolute',
      top: spacing.XS,
      right: spacing.XS,
      backgroundColor: _theme.background.primary,
      borderRadius: radius.M,
      padding: spacing.XS,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
  });
