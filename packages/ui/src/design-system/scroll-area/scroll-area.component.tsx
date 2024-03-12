import type { ReactNode } from 'react';
import React from 'react';

import * as RadixScrollArea from '@radix-ui/react-scroll-area';
import cn from 'classnames';

import * as cx from './scroll-area.css';

interface Props {
  children: ReactNode;
  classNames?: { root?: string; viewport?: string; bar?: string };
}

export const ScrollArea = ({
  children,
  classNames,
}: Readonly<Props>): JSX.Element => (
  <RadixScrollArea.Root className={cn(cx.root, classNames?.root)} type={'auto'}>
    <RadixScrollArea.Viewport className={cn(cx.viewport, classNames?.viewport)}>
      {children}
    </RadixScrollArea.Viewport>
    <RadixScrollArea.Scrollbar
      className={cn(cx.scrollbar, classNames?.bar)}
      orientation="vertical"
    >
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
