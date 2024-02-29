import React from 'react';

import { Tooltip } from 'antd';
import cn from 'classnames';

import * as IconButton from '../icon-buttons';

import * as cx from './table.css';

export interface Headers<T> {
  label: string;
  value: T;
  tooltipText?: string;
}

export interface HeaderProps<T> {
  isActiveSortItem: (value: string) => boolean;
  isSortingAvailable?: (value: string) => boolean;
  onSortChange: (field: T) => void;
  order: 'asc' | 'desc';
  withSelection?: boolean;
  dataTestId?: string;
  headers: Headers<T>[];
}

export const Header = <T extends string>({
  headers,
  isActiveSortItem,
  isSortingAvailable = (): boolean => true,
  onSortChange,
  order,
  withSelection = false,
  dataTestId = 'table',
}: Readonly<HeaderProps<T>>): React.ReactElement => (
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
        <span className={cx.cellInner}>
          <span className={cx.headerItemInner}>
            <Tooltip destroyTooltipOnHide title={tooltipText}>
              {label}
            </Tooltip>
          </span>
          {isSortingAvailable(value) && isActiveSortItem(value) && (
            <IconButton.Caret
              direction={order}
              data-testid={`${dataTestId}-sort-order-${order}`}
            />
          )}
        </span>
      </div>
    ))}
  </div>
);
