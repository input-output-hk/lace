import type { ReactNode } from 'react';
import React from 'react';

import { Box } from '../box';
import { ScrollArea } from '../scroll-area';

import * as cx from './side-drawer-content-body.css';

interface Props {
  children: ReactNode;
}

export const Body = ({ children }: Readonly<Props>): JSX.Element => (
  <Box className={cx.container}>
    <ScrollArea>
      <Box pr="$24" mr="$2" pb="$32">
        {children}
      </Box>
    </ScrollArea>
  </Box>
);
