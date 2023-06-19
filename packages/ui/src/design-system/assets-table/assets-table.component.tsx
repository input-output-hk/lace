import React from 'react';

import * as cx from './assets-table.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'div'> & {
  children: React.ReactNode;
};

export const AssetsTable = ({
  children,
  ...props
}: Readonly<Props>): JSX.Element => (
  <div className={cx.container} {...props}>
    {children}
  </div>
);
