import type { ReactNode } from 'react';

import type { ButtonProps } from '../buttons';

export enum Scheme {
  Outlined = 'Outlined',
  Filled = 'Filled',
  Danger = 'Danger',
  Icon = 'Icon',
  Small = 'Small',
  ExtraSmall = 'ExtraSmall',
}

export type ControlButtonProps = Omit<ButtonProps, 'className'> & {
  icon?: ReactNode;
};

export type ControlButtonWithLabelProps = ControlButtonProps & {
  label?: string;
};

export type ColorScheme =
  | Scheme.Danger
  | Scheme.ExtraSmall
  | Scheme.Filled
  | Scheme.Outlined;
export type ControlButtonWithLabelAndColorSchemeProps =
  ControlButtonWithLabelProps & {
    colorScheme?: ColorScheme;
  };
