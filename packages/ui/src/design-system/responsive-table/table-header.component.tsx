import React from 'react';

import { IconButton } from '@lace/ui';
import { Tooltip } from 'antd';
import cn from 'classnames';

import * as cx from './table.css';

export interface TableHeaders<Columns> {
  label: string;
  value: Columns;
  tooltipText?: string;
}

export interface TableHeaderProps<Columns> {
  isActiveSortItem: (value: string) => boolean;
  isSortingAvailable: (value: string) => boolean;
  onSortChange: (field: Columns) => void;
  order: 'asc' | 'desc';
  withSelection?: boolean;
  dataTestId?: string;
  headers: TableHeaders<Columns>[];
}

export const TableHeader = <T extends string>({
  headers,
  isActiveSortItem,
  isSortingAvailable,
  onSortChange,
  order,
  withSelection = false,
  dataTestId = 'table',
}: Readonly<TableHeaderProps<T>>): React.ReactElement => (
  <div
    data-testid={`${dataTestId}-list-header`}
    className={cn(cx.row, cx.header, {
      [cx.selectable]: withSelection,
    })}
  >
    {/* +1 column in case all the rows have selection available (checkbox as an additional first column) */}
    {withSelection && <div />}
    {headers.map(({ label, value, tooltipText }) => (
      <div
        className={cn(cx.cell, cx.headerItem, {
          [cx.withAction]: isSortingAvailable(value),
          [cx.active]: isActiveSortItem(value),
        })}
        key={value}
        onClick={(): void => {
          onSortChange(value);
        }}
        data-testid={`${dataTestId}-list-header-${value}`}
      >
        <Tooltip destroyTooltipOnHide title={tooltipText}>
          {label}
        </Tooltip>
        {isSortingAvailable(value) && isActiveSortItem(value) && (
          <IconButton.Caret
            direction={order}
            data-testid={`${dataTestId}-sort-order-${order}`}
          />
        )}
      </div>
    ))}
  </div>
);
