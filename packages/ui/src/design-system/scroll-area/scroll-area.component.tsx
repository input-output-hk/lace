import type { ReactNode } from 'react';
import React from 'react';

import * as RadixScrollArea from '@radix-ui/react-scroll-area';

import * as cx from './scroll-area.css';

interface Props {
  children: ReactNode;
}

export const ScrollArea = ({ children }: Readonly<Props>): JSX.Element => (
  <RadixScrollArea.Root className={cx.root} type={'auto'}>
    <RadixScrollArea.Viewport className={cx.viewport}>
      {children}
    </RadixScrollArea.Viewport>
    <RadixScrollArea.Scrollbar className={cx.scrollbar} orientation="vertical">
      <RadixScrollArea.Thumb className={cx.thumb} />
    </RadixScrollArea.Scrollbar>
    <RadixScrollArea.Scrollbar
      className={cx.scrollbar}
      orientation="horizontal"
    >
      <RadixScrollArea.Thumb className={cx.thumb} />
    </RadixScrollArea.Scrollbar>
    <RadixScrollArea.Corner className={cx.scrollAreaCorner} />
  </RadixScrollArea.Root>
);
