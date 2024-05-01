import React from 'react';
import type { ReactNode } from 'react';

import * as Tooltip from '@radix-ui/react-tooltip';

import { TooltipContent } from './tooltip-content.component';
import * as cx from './tooltip-root.css';

export type Props = Pick<
  Tooltip.PopperContentProps,
  'align' | 'children' | 'side'
> &
  typeof Tooltip.Root & {
    label: ReactNode | string;
    zIndex?: number;
  };

export const Root = ({
  label,
  side = 'top',
  align = 'center',
  zIndex,
  children,
}: Readonly<Props>): JSX.Element => {
  return (
    <Tooltip.Root>
      {children}
      <Tooltip.Portal>
        <Tooltip.Content
          style={{ zIndex }}
          side={side}
          align={align}
          className={cx.root}
        >
          <TooltipContent label={label} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
