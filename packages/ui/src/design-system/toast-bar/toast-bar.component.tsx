import React from 'react';

import { Provider } from './toast-bar-provider.component';
import { Root } from './toast-bar-root.component';
import { Viewport } from './toast-bar-viewport.component';

import type { Props as RootProps } from './toast-bar-root.component';

export type Props = RootProps & {
  duration?: number;
  type?: 'background' | 'foreground';
  zIndex?: number;
};

export const ToastBar = ({
  duration,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <Provider duration={duration}>
      <Root {...props} />
      <Viewport />
    </Provider>
  );
};
