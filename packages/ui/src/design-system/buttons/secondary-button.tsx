import React from 'react';

import classNames from 'classnames';

import * as cx from './secondary-button.css';
import { SkeletonButton } from './skeleton-button';

import type { ButtonProps } from './skeleton-button';

export const Secondary = (
  props: Readonly<Omit<ButtonProps, 'className'>>,
): JSX.Element => {
  return (
    <SkeletonButton
      {...props}
      className={{
        container: classNames(cx.container, cx.button),
        label: cx.label,
      }}
    />
  );
};
