import type { ReactNode } from 'react';
import React from 'react';

import { Flex } from '../../flex';

import * as cx from './variants-table-cell.css';

interface Props {
  children?: ReactNode | undefined;
  align?: 'center' | 'left' | 'right';
}

export const Cell = ({
  children,
  align = 'center',
}: Readonly<Props>): JSX.Element => {
  const justifyContent = (): 'center' | 'flex-end' | 'flex-start' => {
    switch (align) {
      case 'center': {
        return 'center';
      }
      case 'left': {
        return 'flex-start';
      }
      case 'right': {
        return 'flex-end';
      }
    }
  };

  return (
    <td className={cx.cell}>
      <Flex alignItems="center" justifyContent={justifyContent()}>
        {children}
      </Flex>
    </td>
  );
};
