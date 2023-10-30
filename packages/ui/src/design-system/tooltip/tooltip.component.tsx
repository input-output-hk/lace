import type { PropsWithChildren, ReactNode } from 'react';
import React from 'react';

import { Trigger } from '@radix-ui/react-tooltip';

import { Provider } from './tooltip-provider.component';
import { Root } from './tooltip-root.component';

import type { Props as RootProps } from './tooltip-root.component';

export type Props = PropsWithChildren<
  RootProps & {
    delayDuration?: number;
    skipDelayDuration?: number;
    children: ReactNode;
  }
>;

export const Tooltip = ({
  delayDuration = 0,
  skipDelayDuration = 0,
  label,
  children,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <Provider
      skipDelayDuration={skipDelayDuration}
      delayDuration={delayDuration}
    >
      <Root label={label} {...props}>
        <Trigger asChild>{children}</Trigger>
      </Root>
    </Provider>
  );
};
