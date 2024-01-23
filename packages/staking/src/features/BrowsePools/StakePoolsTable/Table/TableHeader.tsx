/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { IconButton } from '@lace/ui';
import { Tooltip } from 'antd';
import cn from 'classnames';
import * as styles from './Table.css';

export interface TableHeaders<Columns> {
  label: string;
  value: Columns;
  tooltipText?: string;
}

export type TableHeaderProps<Columns> = {
  isActiveSortItem: (value: string) => boolean;
  isSortingAvailable: (value: string) => boolean;
  onSortChange: (field: Columns) => void;
  order: 'asc' | 'desc';
  withSelection?: boolean;
  dataTestId?: string;
  headers: TableHeaders<Columns>[];
};

export const TableHeader = function TableHeader<T extends string>({
  headers,
  isActiveSortItem,
  isSortingAvailable,
  onSortChange,
  order,
  withSelection,
  dataTestId = 'table',
}: TableHeaderProps<T>) {
  return (
    <div
      data-testid={`${dataTestId}-list-header`}
      className={cn(styles.row, styles.header, { [styles.selectable]: withSelection })}
    >
      {/* checkbox placeholder */}
      {withSelection && <div />}
      {headers.map(({ label, value, tooltipText }) => (
        <div
          className={cn(styles.cell, styles.headerItem, {
            [styles.withAction]: isSortingAvailable(value),
            [styles.active]: isActiveSortItem(value),
          })}
          key={value}
          onClick={() => onSortChange(value)}
          data-testid={`${dataTestId}-list-header-${value}`}
        >
          <Tooltip destroyTooltipOnHide title={tooltipText}>
            {label}
          </Tooltip>
          {isSortingAvailable(value) && isActiveSortItem(value) && (
            <IconButton.Caret direction={order} data-testid={`${dataTestId}-sort-order-${order}`} />
          )}
        </div>
      ))}
    </div>
  );
};
