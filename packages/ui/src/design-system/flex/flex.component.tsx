import React from 'react';
import type { PropsWithChildren } from 'react';

import classNames from 'classnames';

import { sx } from '../../design-tokens';
import { Box } from '../box';

import * as cx from './flex.css';

import type { Sx } from '../../design-tokens';
import type { BoxProps } from '../box';

export type FlexProps = BoxProps &
  Pick<Sx, 'alignItems' | 'flexDirection' | 'justifyContent'>;

export type Props = PropsWithChildren<Readonly<FlexProps>>;

export const Flex = ({
  children,
  alignItems = 'flex-start',
  flexDirection = 'row',
  justifyContent = 'flex-start',
  className,
  ...props
}: Readonly<Props>): JSX.Element => (
  <Box
    {...props}
    className={classNames(
      sx({ alignItems, flexDirection, justifyContent }),
      className,
      cx.flex,
    )}
  >
    {children}
  </Box>
);
