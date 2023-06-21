import type { ReactNode } from 'react';
import React from 'react';

import { Box } from '../box';

import * as cx from './side-drawer-content-card.css';

interface Props {
  children: ReactNode;
}

export const ContentCard = ({ children }: Readonly<Props>): JSX.Element => (
  <Box className={cx.container}>
    <Box className={cx.content}>{children}</Box>
  </Box>
);
