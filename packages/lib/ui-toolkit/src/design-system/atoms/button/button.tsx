import type {
  PressableStateCallbackType,
  StyleProp,
  ViewStyle,
} from 'react-native';

import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme, spacing } from '../../../design-tokens';
import { Icon, Loader, Row, Text } from '../../atoms';

import { getButtonStyles } from './button.styles';

import type { ButtonProps } from './button.types';
import type { IconName } from '../icons/Icon';

const ButtonRoot = ({
  onPress,
  label,
  preIconName,
  postIconName,
  preNode,
  postNode,
  size = 'medium',
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  flex,
  testID = '',
  iconSize,
  iconColor,
}: ButtonProps) => {
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const styles = useMemo(
    () => getButtonStyles({ size, variant, disabled, loading, theme }),
    [size, variant, disabled, loading, theme],
  );

  const hasContent = useMemo(
    (): boolean =>
      Boolean(label || preIconName || postIconName || preNode || postNode),
    [label, preIconName, postIconName, preNode, postNode],
  );

  const renderIcon = useCallback(
    (iconName?: IconName) => {
      if (!iconName) return null;

      return (
        <View>
          <Icon
            name={iconName}
            size={iconSize}
            color={iconColor ?? styles.icon.color}
          />
        </View>
      );
    },
    [iconColor, iconSize, styles.icon],
  );

  const LabelTag = size === 'small' ? Text.S : Text.M;

  const hasOnlyIcon = useMemo(
    () => !label && !preNode && !postNode && (!!preIconName || !!postIconName),
    [label, preNode, postNode, preIconName, postIconName],
  );

  const pressableContainerStyle: (
    state: PressableStateCallbackType,
  ) => StyleProp<ViewStyle> = useCallback(
    state => {
      const { pressed: isPressed } = state;
      const shouldShowHoveredStyle = isHovered && !disabled && !loading;
      return [
        styles.container,
        disabled && styles.disabled,
        shouldShowHoveredStyle && styles.hoveredStyle,
        isPressed && styles.pressedStyle,
        hasOnlyIcon ? styles.hasOnlyIcon : styles.minWidth,
        !hasOnlyIcon && fullWidth && styles.fullWidth,
        !hasOnlyIcon && flex !== undefined && { flex },
      ].filter(Boolean);
    },
    [disabled, loading, hasOnlyIcon, fullWidth, flex, isHovered, styles],
  );

  const pressableContentStyle: StyleProp<ViewStyle> = useMemo(() => {
    return [
      styles.content,
      hasOnlyIcon ? styles.hasOnlyIcon : styles.minWidth,
      !hasOnlyIcon && fullWidth && styles.fullWidth,
    ].filter(Boolean);
  }, [hasOnlyIcon, fullWidth, styles]);

  const handleHoverIn = useCallback(() => {
    if (!disabled && !loading) setIsHovered(true);
  }, [disabled, loading]);

  const handleHoverOut = useCallback(() => {
    setIsHovered(false);
  }, []);

  if (!hasContent) return null;

  return (
    <Pressable
      disabled={disabled || loading}
      style={pressableContainerStyle}
      onPress={onPress}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      testID={testID}>
      <Row
        alignItems="center"
        justifyContent="center"
        style={pressableContentStyle}
        gap={spacing.S}>
        {preNode && <View>{preNode}</View>}
        {renderIcon(preIconName)}
        {label && (
          <LabelTag
            align="center"
            ellipsizeMode="tail"
            numberOfLines={1}
            style={styles.text}>
            {label}
          </LabelTag>
        )}
        {postNode && <View>{postNode}</View>}
        {renderIcon(postIconName)}
        {loading && <Loader color={theme.text.primary} style={styles.loader} />}
      </Row>
    </Pressable>
  );
};

export const Button = {
  Root: ButtonRoot,
  Primary: (props: ButtonProps) => <ButtonRoot variant="primary" {...props} />,
  Secondary: (props: ButtonProps) => (
    <ButtonRoot variant="secondary" {...props} />
  ),
  Tertiary: (props: ButtonProps) => (
    <ButtonRoot variant="tertiary" {...props} />
  ),
  Critical: (props: ButtonProps) => (
    <ButtonRoot variant="critical" {...props} />
  ),
  // TODO: Remove. Replace usages
  Large: (props: ButtonProps) => <ButtonRoot {...props} size="large" />,
  // TODO: Remove. Replace usages
  Medium: (props: ButtonProps) => <ButtonRoot {...props} size="medium" />,
  // TODO: Remove. Replace usages
  Small: (props: ButtonProps) => <ButtonRoot {...props} size="small" />,
};
