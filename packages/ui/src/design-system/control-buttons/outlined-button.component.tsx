import type { ReactNode } from 'react';
import React from 'react';

import cs from 'classnames';

import { SkeletonButton } from '../buttons';

import * as cx from './control-button.css';

import type { ButtonProps } from '../buttons';

type Props = Omit<ButtonProps, 'className'> & { icon: ReactNode };

export const Outlined = (props: Readonly<Props>): JSX.Element => {
  return (
    <SkeletonButton
      {...props}
      className={{
        container: cs(cx.container()),
        label: cx.label(),
      }}
    />
  );
};
