import React, { forwardRef } from 'react';

import classNames from 'classnames';

import * as cx from './primary-button.css';
import { SkeletonButton } from './skeleton-button';

import type { ButtonProps } from './skeleton-button';

export const Primary = forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, 'className'>
>((props, forwardReference) => {
  return (
    <SkeletonButton
      {...props}
      ref={forwardReference}
      className={{
        container: classNames(cx.container, cx.button),
        label: cx.label,
      }}
    />
  );
});
// eslint-disable-next-line functional/immutable-data
Primary.displayName = 'Primary';
