import type { ReactNode } from 'react';
import React from 'react';

import classNames from 'classnames';

import { SkeletonButton } from '../buttons';

import * as cx from './filled-button.css';

import type { ButtonProps } from '../buttons';

type Props = Omit<ButtonProps, 'className'> & { icon: ReactNode };

export const Filled = (props: Readonly<Props>): JSX.Element => {
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
