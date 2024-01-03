import React from 'react';

import cn from 'classnames';

import { SkeletonButton } from '../buttons';

import * as cx from './control-button.css';
import { Scheme } from './control-button.data';

import type { ControlButtonWithLabelProps } from './control-button.data';

export const ExtraSmall = (
  props: Readonly<ControlButtonWithLabelProps>,
): JSX.Element => {
  return (
    <SkeletonButton
      {...props}
      className={{
        container: cn(
          cx.container({
            paddingScheme: Scheme.ExtraSmall,
            colorScheme: Scheme.ExtraSmall,
            borderScheme: Scheme.ExtraSmall,
            widthSchema: Scheme.ExtraSmall,
          }),
        ),
        label: cx.label({
          colorScheme: Scheme.ExtraSmall,
        }),
        icon: cx.icon(),
      }}
      size="small"
    />
  );
};
