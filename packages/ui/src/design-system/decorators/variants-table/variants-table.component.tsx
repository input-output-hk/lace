import type { PropsWithChildren } from 'react';
import React from 'react';

import { Text } from '../../text';

import * as cx from './variants-table.css';

type Props = PropsWithChildren<{
  headers?: string[];
}>;

export const Table = ({
  headers = [],
  children,
}: Readonly<Props>): JSX.Element => {
  return (
    <table className={cx.table}>
      {headers.length > 0 && (
        <thead>
          <tr>
            {headers.map(header => (
              <th key={header} className={cx.header}>
                <Text.Label weight="$medium">{header}</Text.Label>
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>{children}</tbody>
    </table>
  );
};
