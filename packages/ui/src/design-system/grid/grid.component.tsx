import React from 'react';
import type { PropsWithChildren } from 'react';

import { grid } from './grid.css';

import type { GridVariants } from './grid.css';

export type Props = PropsWithChildren<{
  columns?: GridVariants['columns'];
  rows?: GridVariants['rows'];
  gutters?: GridVariants['gutters'];
}>;

export const Grid = ({
  columns = '$none',
  children,
  rows = '$none',
  gutters = '$16',
}: Readonly<Props>): JSX.Element => (
  <div className={grid({ columns, rows, gutters })}>{children}</div>
);
