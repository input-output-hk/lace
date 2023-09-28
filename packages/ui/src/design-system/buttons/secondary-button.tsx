import React, { forwardRef } from 'react';

import classNames from 'classnames';

import * as cx from './secondary-button.css';
import { SkeletonButton } from './skeleton-button';

import type { ButtonProps } from './skeleton-button';

export const Secondary = forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, 'className'>
>((props, forwardReference) => {
  return (
    <SkeletonButton
      {...props}
      className={{
        container: classNames(cx.container, cx.button),
        label: cx.label,
      }}
      ref={forwardReference}
    />
  );
});
// eslint-disable-next-line functional/immutable-data
Secondary.displayName = 'Secondary';
