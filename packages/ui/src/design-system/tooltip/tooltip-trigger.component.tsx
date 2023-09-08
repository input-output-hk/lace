import React from 'react';

import * as Tooltip from '@radix-ui/react-tooltip';

interface Props {
  children: React.ReactNode;
}

export const Trigger = ({ children }: Readonly<Props>): JSX.Element => (
  <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
);
