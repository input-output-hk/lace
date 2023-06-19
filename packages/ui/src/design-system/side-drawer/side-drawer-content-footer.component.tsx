import type { ReactNode } from 'react';
import React from 'react';

import { Box } from '../box';

import * as cx from './side-drawer-content-footer.css';
import { Separator } from './side-drawer-separator.component';

interface Props {
  children: ReactNode;
}

export const Footer = ({ children }: Readonly<Props>): JSX.Element => (
  <Box className={cx.gridArea}>
    <Separator />
    <Box className={cx.container}>{children}</Box>
  </Box>
);
