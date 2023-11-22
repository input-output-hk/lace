import type { PropsWithChildren, ReactNode } from 'react';
import React from 'react';

import * as Tooltip from '@radix-ui/react-tooltip';

import { RichTooltipContent } from './rich-tooltip-content.component';

export type Props = PropsWithChildren<
  typeof Tooltip.Root & {
    title: string;
    description: ReactNode;
  }
>;

export const RichTooltipRoot = ({
  title,
  description,
  children,
}: Readonly<Props>): JSX.Element => {
  return (
    <Tooltip.Root>
      {children}
      <Tooltip.Portal>
        <Tooltip.Content>
          <RichTooltipContent title={title} description={description} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
