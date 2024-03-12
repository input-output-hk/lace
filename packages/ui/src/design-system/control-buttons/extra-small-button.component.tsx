import React from 'react';

import cn from 'classnames';

import { SkeletonButton } from '../buttons';

import * as cx from './control-button.css';
import { Scheme } from './control-button.data';

import type { ControlButtonWithLabelAndColorSchemeProps } from './control-button.data';

export const ExtraSmall = (
  props: Readonly<ControlButtonWithLabelAndColorSchemeProps>,
): JSX.Element => {
  return (
    <SkeletonButton
      {...props}
      className={{
        container: cn(
          cx.container({
            paddingScheme: Scheme.ExtraSmall,
            colorScheme: props.colorScheme ?? Scheme.ExtraSmall,
            borderScheme: props.colorScheme ?? Scheme.ExtraSmall,
            widthSchema: Scheme.ExtraSmall,
          }),
        ),
        label: cx.label({
          colorScheme: props.colorScheme ?? Scheme.ExtraSmall,
          sizeScheme: Scheme.ExtraSmall,
        }),
        icon: cx.icon(),
      }}
      size="small"
    />
  );
};
