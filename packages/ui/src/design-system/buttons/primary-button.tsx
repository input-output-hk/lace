import React from 'react';

import classNames from 'classnames';

import * as cx from './primary-button.css';
import { SkeletonButton } from './skeleton-button';

import type { ButtonProps } from './skeleton-button';

export const Primary = (
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
