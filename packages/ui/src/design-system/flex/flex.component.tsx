import React from 'react';
import type { Ref, PropsWithChildren } from 'react';

import classNames from 'classnames';

import { sx } from '../../design-tokens';
import { Box } from '../box';

import * as cx from './flex.css';

import type { Sx } from '../../design-tokens';
import type { BoxProps } from '../box';

export type FlexProps = BoxProps &
  Pick<Sx, 'alignItems' | 'flexDirection' | 'gap' | 'justifyContent'>;

export type Props = PropsWithChildren<Readonly<FlexProps>>;

export const FlexComponent = (
  {
    children,
    alignItems = 'flex-start',
    flexDirection = 'row',
    gap = '$0',
    justifyContent = 'flex-start',
    className,
    ...props
  }: Readonly<Props>,
  ref: Ref<HTMLDivElement | null>,
): React.ReactElement => (
  <Box
    {...props}
    className={classNames(
      sx({ alignItems, flexDirection, gap, justifyContent }),
      className,
      cx.flex,
    )}
    ref={ref}
  >
    {children}
  </Box>
);

export const Flex = React.forwardRef(FlexComponent);
