import React from 'react';
import type { PropsWithChildren } from 'react';

import { Box } from '../box';

import { cell } from './cell.css';

import type { CellVariants } from './cell.css';
import type { BoxProps } from '../box';

export type Props = PropsWithChildren<
  Readonly<
    BoxProps & {
      rowStart?: CellVariants['rowStart'];
      rowEnd?: CellVariants['rowEnd'];
      colStart?: CellVariants['colStart'];
      colEnd?: CellVariants['colEnd'];
    }
  >
>;

export const Cell = ({
  children,
  colStart = '$auto',
  colEnd = '$auto',
  rowStart = '$auto',
  rowEnd = '$auto',
  ...props
}: Readonly<Props>): JSX.Element => (
  <Box {...props} className={cell({ colStart, colEnd, rowStart, rowEnd })}>
    {children}
  </Box>
);
