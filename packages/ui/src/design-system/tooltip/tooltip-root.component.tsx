import type { PropsWithChildren } from 'react';
import React from 'react';

import * as Tooltip from '@radix-ui/react-tooltip';

import { TooltipContent } from './tooltip-content.component';
import * as cx from './tooltip-root.css';

export type Props = PropsWithChildren<
  Pick<Tooltip.PopperContentProps, 'side'> &
    typeof Tooltip.Root & {
      label: string;
    }
>;

export const Root = ({
  label,
  side = 'top',
  children,
}: Readonly<Props>): JSX.Element => {
  return (
    <Tooltip.Root>
      {children}
      <Tooltip.Portal>
        <Tooltip.Content side={side} className={cx.root}>
          <TooltipContent label={label} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
