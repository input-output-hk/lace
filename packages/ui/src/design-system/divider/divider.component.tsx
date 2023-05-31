import type { PropsWithChildren } from 'react';
import React from 'react';

import { Box } from '../box';

import * as cx from './divider.css';

import type { BoxProps } from '../box';

export type Props = PropsWithChildren<Readonly<Omit<BoxProps, 'className'>>>;

export const Divider = (props: Readonly<BoxProps>): JSX.Element => (
  <Box {...props} h="$1" className={cx.divider} />
);
