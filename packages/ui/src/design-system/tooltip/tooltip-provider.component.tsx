import React from 'react';
import type { PropsWithChildren } from 'react';

import * as Tooltip from '@radix-ui/react-tooltip';

type Props = PropsWithChildren<{
  delayDuration?: number;
  skipDelayDuration?: number;
}>;

export const Provider = ({
  delayDuration = 0,
  skipDelayDuration = 0,
  children,
}: Readonly<Props>): JSX.Element => {
  return (
    <Tooltip.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
    >
      {children}
    </Tooltip.Provider>
  );
};
