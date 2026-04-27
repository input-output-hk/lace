import { Platform, StyleSheet } from 'react-native';

import { radius, spacing } from '../../../design-tokens';
import { getShadowStyle } from '../../../design-tokens/tokens/shadows';

import type {
  ButtonStyleSheetProps,
  ThemeButtonVariants,
} from './button.types';
import type { Theme } from '../../../design-tokens';

const SIZES = {
  small: 40,
  medium: 50,
  large: 64,
};

const PADDING_HORIZONTAL = {
  small: spacing.S,
  medium: spacing.S,
  large: spacing.S,
};

const PADDING_VERTICAL = {
  small: spacing.M,
  medium: spacing.M,
  large: spacing.M,
};

const OUTER_BORDER_RADIUS = {
  small: radius.rounded,
  medium: radius.rounded,
  large: radius.rounded,
};

const INNER_BORDER_RADIUS = {
  small: radius.rounded,
  medium: radius.rounded,
  large: radius.rounded,
};

const OUTER_BORDER_WIDTH = {
  primary: 0,
  secondary: 0,
  tertiary: 0.5,
  critical: 0,
};

const INNER_BORDER_WIDTH = {
  primary: 0,
  secondary: 0,
  tertiary: 0,
  critical: 0,
};

const OPACITY_TEXT = {
  disabled: 0.5,
  enabled: 1,
};

export const getButtonStyles = ({
  size,
  variant,
  disabled,
  loading,
  theme,
}: ButtonStyleSheetProps) => {
  const buttonColors = getButtonColorsByVariant({ theme, variant, disabled });

  const opacityText =
    loading || disabled ? OPACITY_TEXT.disabled : OPACITY_TEXT.enabled;

  return StyleSheet.create({
    container: {
      borderRadius: OUTER_BORDER_RADIUS[size],
      borderWidth: OUTER_BORDER_WIDTH[variant],
      borderColor: buttonColors[variant].borders.outerBorder,
      backgroundColor: buttonColors[variant].background.idle,
      overflow: 'hidden',
    },
    content: {
      paddingVertical: PADDING_VERTICAL[size],
      paddingHorizontal: PADDING_HORIZONTAL[size],
      borderRadius: INNER_BORDER_RADIUS[size],
      borderWidth: INNER_BORDER_WIDTH[variant],
      borderColor: buttonColors[variant].borders.innerBorder,
    },
    fullWidth: {
      width: '100%',
    },
    minWidth: {
      minWidth: SIZES[size],
    },
    hasOnlyIcon: {
      width: SIZES[size],
      height: SIZES[size],
      alignSelf: 'flex-start',
    },
    text: {
      color: buttonColors[variant].label.color,
      opacity:
        (variant === 'primary' || variant === 'critical') && disabled
          ? 1
          : opacityText,
      flexShrink: 1,
    },
    icon: {
      color: buttonColors[variant].label.color,
    },
    loader: {
      position: 'absolute',
    },
    iconButtonLoader: {
      position: 'absolute',
    },
    disabled: {
      backgroundColor: buttonColors[variant].background.disabled,
    },
    pressedStyle: {
      backgroundColor:
        Platform.OS === 'web'
          ? buttonColors[variant].background.idle
          : buttonColors[variant].background.pressed,
      ...getShadowStyle({ theme, variant: 'inset' }),
      opacity: Platform.OS !== 'web' ? 0.5 : 1,
    },
    hoveredStyle: {
      ...getShadowStyle({ theme, variant: 'elevated' }),
    },
  });
};

const getButtonColorsByVariant = ({
  theme,
  variant,
  disabled,
}: {
  theme: Theme;
  variant?: string;
  disabled?: boolean;
}): ThemeButtonVariants => ({
  primary: {
    background: {
      idle: theme.brand.ascending,
      disabled: theme.background.tertiary,
      pressed: theme.brand.ascending,
      hovered: theme.brand.ascending,
    },
    label: {
      color:
        variant === 'primary' && disabled
          ? theme.text.tertiary
          : theme.brand.white,
    },
    borders: {
      outerBorder: theme.extra.fancyBorder,
      innerBorder: 'transparent',
    },
    spinner: theme.brand.white,
  },
  secondary: {
    background: {
      idle: theme.background.primary,
      disabled: theme.background.tertiary,
      pressed: theme.background.primary,
      hovered: theme.background.primary,
    },
    label: { color: theme.text.primary },
    borders: {
      outerBorder: theme.border.bottom,
      innerBorder: 'transparent',
    },
    spinner: theme.brand.white,
  },
  tertiary: {
    background: {
      idle: theme.background.tertiary,
      disabled: theme.background.secondary,
      pressed: theme.background.tertiary,
      hovered: theme.background.tertiary,
    },
    label: { color: theme.text.primary },
    borders: {
      outerBorder: theme.extra.shadowInnerStrong,
      innerBorder: 'transparent',
    },
    spinner: theme.brand.white,
  },
  critical: {
    background: {
      idle: theme.background.negative,
      disabled: theme.background.tertiary,
      pressed: theme.background.negative,
      hovered: theme.background.negative,
    },
    label: {
      color: disabled ? theme.text.tertiary : theme.brand.white,
    },
    borders: {
      outerBorder: theme.extra.fancyBorder,
      innerBorder: 'transparent',
    },
    spinner: theme.brand.white,
  },
});
