import type { ReactNode } from 'react';
import React from 'react';

import classNames from 'classnames';

import { Box } from '../box';

import * as cx from './side-drawer-content-card.css';

interface Props {
  children: ReactNode;
}

export const ContentCard = ({
  children,
  ...props
}: Readonly<Props>): JSX.Element => (
  <Box {...props} className={classNames(cx.container)}>
    <Box className={cx.content}>{children}</Box>
  </Box>
);
