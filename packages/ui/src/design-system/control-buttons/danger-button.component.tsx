import React from 'react';

import cn from 'classnames';

import { SkeletonButton } from '../buttons';

import * as cx from './control-button.css';
import { Scheme } from './control-button.data';

import type { ControlButtonWithLabelProps } from './control-button.data';

export const Danger = (
  props: Readonly<ControlButtonWithLabelProps>,
): JSX.Element => {
  return (
    <SkeletonButton
      {...props}
      className={{
        container: cn(
          cx.container({
            colorScheme: Scheme.Danger,
            borderScheme: Scheme.Danger,
          }),
        ),
        label: cx.label({ colorScheme: Scheme.Danger }),
        icon: cx.icon({ colorScheme: Scheme.Danger }),
      }}
    />
  );
};
