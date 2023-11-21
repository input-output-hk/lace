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
