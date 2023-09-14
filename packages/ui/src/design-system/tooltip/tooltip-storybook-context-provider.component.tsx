import type { FC } from 'react';
import React from 'react';

import * as Tooltip from '@radix-ui/react-tooltip';

/*
 * [WARNING]: This is a wrapper for storybook usage only. Do not use this in production.
 * It provides necessary context for Tooltip.Root component.
 * */
export const TooltipStorybookContextProvider: FC = ({ children }) => {
  return (
    <Tooltip.Provider delayDuration={0} skipDelayDuration={0}>
      <Tooltip.Root>{children}</Tooltip.Root>
    </Tooltip.Provider>
  );
};
