import type { ReactNode } from 'react';
import React, { forwardRef } from 'react';

import cn from 'classnames';

import * as cx from './tooltip-content.css';

export interface TooltipContentProps {
  children: ReactNode;
  className?: string;
}

export const Content = forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ children, className }, forwardedReference) => (
    <div ref={forwardedReference} className={cn(cx.tooltipContent, className)}>
      {children}
    </div>
  ),
);

// eslint-disable-next-line functional/immutable-data
Content.displayName = 'TooltipContent';
