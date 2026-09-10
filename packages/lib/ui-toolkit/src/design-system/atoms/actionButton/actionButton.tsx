import type { TextStyle, ViewStyle } from 'react-native';
import type { PressableProps } from 'react-native';

import React, { useMemo } from 'react';
import { StyleSheet, Pressable } from 'react-native';

import { radius, spacing, useTheme } from '../../../design-tokens';
import { BlurView } from '../blur-view/blur-view';
import { Column } from '../column/column';
import { Icon } from '../icons/Icon';
import { Loader } from '../loader/loader';
import { Text } from '../text/text';

import type { Theme } from '../../../design-tokens';
import type { IconName } from '../icons/Icon';

export type ActionButtonProps = Omit<PressableProps, 'style'> & {
  icon: IconName | React.ReactElement;
  title?: string;
  showTitle?: boolean;
  description?: string;
  vertical?: boolean;
  /** Appends a spinner and blocks presses, like `Button`'s own `loading`. */
  loading?: boolean;
  textAlign?: 'center' | 'left';
  containerStyle?: ViewStyle | ViewStyle[];
  titleStyle?: TextStyle;
  iconStyle?: {
    variant?: 'solid' | 'stroke';
    color?: string;
    size?: number;
  };
};

export const ActionButton = ({
  title,
  showTitle = true,
  description,
  icon,
  vertical = false,
  disabled = false,
  loading = false,
  textAlign,
  containerStyle,
  titleStyle,
  iconStyle,
  testID,
  ...restProps
}: ActionButtonProps) => {
  const { theme } = useTheme();
  const isPressBlocked = disabled || loading;

  const defaultStyles = styles({
    theme,
    vertical,
    textAlign,
  });

  const IconComponent = useMemo(
    () =>
      typeof icon === 'string' ? (
        <Icon
          name={icon}
          variant={iconStyle?.variant}
          color={iconStyle?.color}
          size={iconStyle?.size}
          testID={`${testID}-icon`}
        />
      ) : (
        icon
      ),
    [icon, iconStyle, testID],
  );

  return (
    <BlurView style={defaultStyles.blurContainer} testID={testID}>
      <Pressable
        disabled={isPressBlocked}
        style={({ pressed }) => [
          defaultStyles.default,
          pressed && defaultStyles.pressed,
          isPressBlocked && defaultStyles.disabled,
          containerStyle,
        ]}
        {...restProps}>
        {IconComponent}
        {(!!description || (showTitle && title !== undefined)) && (
          <Column style={defaultStyles.textWrapper}>
            {showTitle && title !== undefined && (
              <Text.M
                style={[defaultStyles.title, titleStyle]}
                numberOfLines={2}
                testID={`${testID}-title`}>
                {title}
              </Text.M>
            )}
            {!!description && (
              <Text.XS
                variant="secondary"
                style={defaultStyles.description}
                numberOfLines={3}
                testID={`${testID}-description`}>
                {description}
              </Text.XS>
            )}
          </Column>
        )}
        {loading && (
          <Loader
            size={20}
            color={theme.text.primary}
            testID={`${testID}-loader`}
          />
        )}
      </Pressable>
    </BlurView>
  );
};

type ActionButtonStyleProps = {
  theme: Theme;
  vertical: boolean;
  textAlign?: 'center' | 'left';
};

const styles = ({ theme, vertical, textAlign }: ActionButtonStyleProps) => {
  const defaultTextAlignment = vertical ? 'center' : 'left';
  const finalTextAlignment = textAlign || defaultTextAlignment;

  return StyleSheet.create({
    blurContainer: {
      overflow: 'hidden',
      borderRadius: radius.M,
      borderTopColor: theme.border.top,
      borderColor: theme.border.middle,
      borderBottomColor: theme.border.bottom,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: theme.background.primary,
    },
    default: {
      flexDirection: vertical ? 'column' : 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.S,
      paddingVertical: spacing.S,
      gap: spacing.S,
    },
    pressed: {
      opacity: 0.5,
    },
    disabled: {
      opacity: 0.5,
    },
    title: {
      textAlign: finalTextAlignment,
    },
    description: {
      textAlign: finalTextAlignment,
    },
    // Small gap, not none: the title and description are flush otherwise, which
    // reads as one wrapped sentence rather than a label and its explanation.
    textWrapper: {
      flexShrink: 1,
      gap: spacing.XS,
    },
  });
};
