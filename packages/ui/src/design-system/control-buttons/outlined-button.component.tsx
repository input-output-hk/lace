import React from 'react';

import cn from 'classnames';

import { SkeletonButton } from '../buttons';

import * as cx from './control-button.css';

import type { ControlButtonProps } from './control-button.data';

export const Outlined = (props: Readonly<ControlButtonProps>): JSX.Element => {
  return (
    <SkeletonButton
      {...props}
      className={{
        container: cn(cx.container()),
        label: cx.label(),
      }}
    />
  );
};
