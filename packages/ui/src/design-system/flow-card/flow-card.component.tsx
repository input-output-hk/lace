import React from 'react';

import * as cx from './flow-card.css';
import classNames from 'classnames';
import type { OmitClassName } from '../../types';
import { Box } from '../box';

type Props = OmitClassName<'div'> & {
  children: React.ReactNode;
  flowCardClassName?: string;
};

export const Card = ({ children, ...props }: Readonly<Props>): JSX.Element => (
  <Box
    className={classNames([cx.container, props.flowCardClassName])}
    {...props}
  >
    {children}
  </Box>
);
