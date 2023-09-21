import React from 'react';
import type { ReactNode } from 'react';

import { Root } from './rich-tooltip-root.component';
import { Provider } from './tooltip-provider.component';
import { Trigger } from './tooltip-trigger.component';

import type { Props as TooltipProps } from './tooltip.component';

type Props = Omit<TooltipProps, 'label'> & {
  title: string;
  description: ReactNode;
};

export const RichTooltip = ({
  delayDuration = 0,
  skipDelayDuration = 0,
  title,
  description,
  children,
  ...props
}: Readonly<Props>): JSX.Element => (
  <Provider skipDelayDuration={skipDelayDuration} delayDuration={delayDuration}>
    <Root title={title} description={description} {...props}>
      <Trigger>{children}</Trigger>
    </Root>
  </Provider>
);
