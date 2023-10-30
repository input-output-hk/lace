import type { ReactNode } from 'react';
import React, { forwardRef } from 'react';

export interface TooltipContentProps {
  children: ReactNode;
  className?: string;
}

/*
 * [WARNING]: This is a wrapper for storybook usage only. Do not use this in production.
 * It allows storybook to automatically render tooltip contents without hover or trigger components.
 * */
export const StorybookContentRenderer = forwardRef<
  HTMLDivElement,
  TooltipContentProps
>(({ children }, forwardedReference) => (
  <div ref={forwardedReference}>{children}</div>
));

// eslint-disable-next-line functional/immutable-data
StorybookContentRenderer.displayName = 'StorybookTooltipContent';
