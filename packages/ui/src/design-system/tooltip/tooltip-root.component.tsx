import type { PropsWithChildren } from 'react';
import React from 'react';

import * as Tooltip from '@radix-ui/react-tooltip';

import { TooltipContent } from './tooltip-content.component';

export type Props = PropsWithChildren<
  typeof Tooltip.Root & {
    label: string;
  }
>;

export const Root = ({ label, children }: Readonly<Props>): JSX.Element => {
  return (
    <Tooltip.Root>
      {children}
      <Tooltip.Portal>
        <Tooltip.Content>
          <TooltipContent label={label} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
