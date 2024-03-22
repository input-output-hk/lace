import type { PropsWithChildren } from 'react';
import React from 'react';

import * as Tooltip from '@radix-ui/react-tooltip';

import { TooltipContent } from './tooltip-content.component';

export type Props = Pick<
  Tooltip.PopperContentProps,
  'align' | 'children' | 'side'
> &
  typeof Tooltip.Root & {
    label: string;
  };

export const Root = ({
  label,
  side = 'top',
  align = 'center',
  children,
}: Readonly<Props>): JSX.Element => {
  return (
    <Tooltip.Root>
      {children}
      <Tooltip.Portal>
        <Tooltip.Content side={side} align={align}>
          <TooltipContent label={label} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
