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
  side,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <Provider
      skipDelayDuration={skipDelayDuration}
      delayDuration={delayDuration}
    >
      <Root side={side} label={label} {...props}>
        <Trigger asChild>
          <div>{children}</div>
        </Trigger>
      </Root>
    </Provider>
  );
};
