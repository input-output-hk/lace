import React from 'react';

import cn from 'classnames';

import { SkeletonButton } from '../buttons';

import * as cx from './control-button.css';
import { Scheme } from './control-button.data';

import type { ControlButtonProps } from './control-button.data';

interface Props extends ControlButtonProps {
  size?: 'extraSmall' | 'small';
}

export const Icon = ({
  size = 'small',
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <SkeletonButton
      {...props}
      size={size}
      className={{
        container: cn(
          cx.container({ paddingScheme: Scheme.Icon, widthSchema: size }),
        ),
        label: cx.label(),
        icon: cx.icon({
          fontSize: size,
        }),
      }}
    />
  );
};
