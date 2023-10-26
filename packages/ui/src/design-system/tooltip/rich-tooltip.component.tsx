import type { PropsWithChildren, ReactNode } from 'react';
import React from 'react';

import { Trigger } from '@radix-ui/react-tooltip';

import { RichTooltipRoot } from './rich-tooltip-root.component';
import { Provider } from './tooltip-provider.component';

import type { Props as RootProps } from './rich-tooltip-root.component';

export type Props = PropsWithChildren<
  RootProps & {
    delayDuration?: number;
    skipDelayDuration?: number;
    children: ReactNode;
  }
>;

export const RichTooltip = ({
  delayDuration = 0,
  skipDelayDuration = 0,
  title,
  description,
  children,
  ...props
}: Readonly<Props>): JSX.Element => {
  return (
    <Provider
      skipDelayDuration={skipDelayDuration}
      delayDuration={delayDuration}
    >
      <RichTooltipRoot title={title} description={description} {...props}>
        <Trigger asChild>{children}</Trigger>
      </RichTooltipRoot>
    </Provider>
  );
};
