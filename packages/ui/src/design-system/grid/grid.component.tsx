import React from 'react';
import type { PropsWithChildren } from 'react';

import { grid } from './grid.css';

import type { GridVariants } from './grid.css';

export type Props = PropsWithChildren<{
  columns?: GridVariants['columns'];
  rows?: GridVariants['rows'];
  gutters?: GridVariants['gutters'];
  alignItems?: GridVariants['alignItems'];
}>;

export const Grid = ({
  columns = '$none',
  children,
  rows = '$none',
  alignItems,
  gutters = '$16',
}: Readonly<Props>): JSX.Element => (
  <div className={grid({ columns, rows, gutters, alignItems })}>{children}</div>
);
