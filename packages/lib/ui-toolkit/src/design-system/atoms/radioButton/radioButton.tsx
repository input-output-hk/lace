import type { StyleProp, ViewStyle } from 'react-native';

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';

import { radius, useTheme } from '../../../design-tokens';
import { Icon } from '../icons/Icon';

import type { Theme } from '../../../design-tokens';

export type RadioButtonProps = {
  isChecked?: boolean;
  isDisabled?: boolean;
  onRadioValueChange: () => void;
  style?: StyleProp<ViewStyle>;
  value?: string;
  showBorder?: boolean;
  testID?: string;
};

export const RadioButton = ({
  isChecked = false,
  isDisabled = false,
  onRadioValueChange,
  style,
  showBorder = false,
  testID,
}: RadioButtonProps) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const styles = useMemo(() => getStyles(theme), [theme]);

  const handlePress = useCallback(() => {
    if (!isDisabled) onRadioValueChange();
  }, [isDisabled, onRadioValueChange]);

  const shouldShowBorder = useMemo(
    () => isFocused || isHovered || isChecked || isDisabled || showBorder,
    [isFocused, isHovered, isChecked, isDisabled, showBorder],
  );
  const shouldShowCheck = useMemo(
    () => isChecked || isFocused || isHovered,
    [isChecked, isFocused, isHovered],
  );
  const isOpacityWrapperNeeded = isDisabled && isChecked;

  const buttonStyle = useMemo(
    () =>
      [
        styles.buttonBase,
        isChecked && styles.buttonChecked,
        isDisabled && !isChecked && styles.buttonDisabledUnchecked,
        !isDisabled &&
          (isFocused || isHovered) &&
          !isChecked &&
          styles.buttonHovered,
        style,
      ].filter(Boolean),
    [styles, isChecked, isDisabled, isFocused, isHovered, style],
  );

  const checkWrapperStyle = useMemo(
    () =>
      [
        styles.checkWrapperBase,
        isOpacityWrapperNeeded && { opacity: 0.7 },
      ].filter(Boolean),
    [styles.checkWrapperBase, isOpacityWrapperNeeded],
  );

  const handleOnFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleOnBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleOnHoverIn = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleOnHoverOut = useCallback(() => {
    setIsHovered(false);
  }, []);

  const content = (
    <Pressable
      style={buttonStyle}
      onPress={handlePress}
      onFocus={handleOnFocus}
      onBlur={handleOnBlur}
      onHoverIn={handleOnHoverIn}
      onHoverOut={handleOnHoverOut}
      disabled={isDisabled}
      accessibilityRole="radio"
      accessibilityState={{ disabled: isDisabled, selected: isChecked }}
      testID={testID}>
      <View style={styles.iconContainer}>
        {shouldShowBorder && (
          <View style={styles.radioBorder} pointerEvents="none" />
        )}
        {shouldShowCheck && (
          <View style={checkWrapperStyle} pointerEvents="none">
            <Icon
              name="Checkmark"
              size={16}
              color={isDisabled ? theme.text.secondary : theme.brand.white}
              testID={testID ? `${testID}-checkmark` : 'checkmark'}
            />
          </View>
        )}
      </View>
    </Pressable>
  );

  return isOpacityWrapperNeeded ? (
    <View style={styles.opacityWrapper}>{content}</View>
  ) : (
    content
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    buttonBase: {
      left: 2,
      borderRadius: radius.rounded,
      width: 28,
      height: 28,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background.secondary,
    },
    buttonChecked: {
      backgroundColor: theme.background.tertiary,
    },
    buttonDisabledUnchecked: {
      backgroundColor: theme.background.tertiary,
    },
    buttonHovered: {
      backgroundColor: theme.background.tertiary,
    },
    iconContainer: {
      width: 28,
      height: 28,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    radioBorder: {
      position: 'absolute',
      top: -2,
      left: -2,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
      backgroundColor: theme.background.tertiary,
      borderRadius: radius.rounded,
    },
    checkWrapperBase: {
      position: 'absolute',
      top: 4,
      left: 4,
      width: 20,
      height: 20,
      borderRadius: radius.rounded,
      backgroundColor: theme.background.positive,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2,
    },
    opacityWrapper: {
      opacity: 0.5,
    },
  });
