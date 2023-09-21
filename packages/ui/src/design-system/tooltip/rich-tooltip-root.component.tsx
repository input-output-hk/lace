import React from 'react';
import type { PropsWithChildren, ReactNode } from 'react';

import * as Tooltip from '@radix-ui/react-tooltip';

import { RichContentInner } from './rich-tooltip-content-inner.component';
import { Content } from './tooltip-content.component';

export type Props = PropsWithChildren<
  typeof Tooltip.Root & {
    title: string;
    description: ReactNode;
  }
>;

export const Root = ({
  title,
  description,
  children,
}: Readonly<Props>): JSX.Element => {
  return (
    <Tooltip.Root>
      {children}
      <Tooltip.Portal>
        <Content>
          <RichContentInner title={title} description={description} />
        </Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
