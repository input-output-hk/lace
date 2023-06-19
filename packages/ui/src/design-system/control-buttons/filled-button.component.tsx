import React from 'react';

import cn from 'classnames';

import { SkeletonButton } from '../buttons';

import * as cx from './control-button.css';
import { Scheme } from './control-button.data';

import type { ControlButtonProps } from './control-button.data';

export const Filled = (props: Readonly<ControlButtonProps>): JSX.Element => {
  return (
    <SkeletonButton
      {...props}
      className={{
        container: cn(
          cx.container({
            colorScheme: Scheme.Filled,
            borderScheme: Scheme.Filled,
          }),
        ),
        label: cx.label({ colorScheme: Scheme.Filled }),
      }}
    />
  );
};
