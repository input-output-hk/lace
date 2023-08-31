import React from 'react';

import classNames from 'classnames';

import * as cx from './call-to-action-button.css';
import { SkeletonButton } from './skeleton-button';

import type { ButtonProps } from './skeleton-button';

type Props = Omit<ButtonProps, 'className' | 'icon'>;

export const CallToAction = (props: Readonly<Props>): JSX.Element => {
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
