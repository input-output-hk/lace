import type { ReactNode } from 'react';
import type { PressableProps } from 'react-native';

import type { Theme } from '../../../design-tokens';
import type { IconName } from '../icons/Icon';
import type { RequireAtLeastOne } from 'type-fest';

export type ButtonVariant = 'critical' | 'primary' | 'secondary' | 'tertiary';

export type ButtonSize = 'large' | 'medium' | 'small';

export type ButtonState =
  | 'disabled'
  | 'focused'
  | 'hover'
  | 'idle'
  | 'loading'
  | 'pressed';

type ButtonContentProps = {
  label?: string;
  preIconName?: IconName;
  postIconName?: IconName;
  preNode?: ReactNode;
  postNode?: ReactNode;
  iconSize?: number;
  iconColor?: string;
};

type ButtonBaseProps = Omit<PressableProps, 'style'> & {
  onPress: () => void;
  size?: ButtonSize;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  testID?: string;
  flex?: number;
};

export type ButtonProps = ButtonBaseProps &
  RequireAtLeastOne<ButtonContentProps>;

export interface ButtonStyleSheetProps {
  size: ButtonSize;
  variant: ButtonVariant;
  theme: Theme;
  disabled?: boolean;
  loading?: boolean;
}

export type ThemeButtonVariants = Record<ButtonVariant, ButtonTheme>;

export type ButtonBackground = {
  idle: string;
  disabled: string;
  pressed: string;
  hovered: string;
};

export interface ButtonTheme {
  background: ButtonBackground;
  label: {
    color: string;
  };
  borders: {
    innerBorder?: string;
    outerBorder?: string;
  };
  spinner: string;
}
