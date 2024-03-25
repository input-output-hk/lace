/* eslint-disable react/no-multi-comp */
import type { ReactNode } from 'react';
import React from 'react';

import cn from 'classnames';

import { Checkbox } from '../checkbox';
import { Tooltip } from '../tooltip';

import * as cx from './table.css';

export interface RowProps<T extends object> {
  columns: (string & keyof T)[];
  data: T;
  selectionDisabledMessage?: string;
  withSelection?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onClick?: () => void;
  // TODO fix conflicting prettier and eslint configuration in @lace/ui; https://input-output.atlassian.net/browse/LW-9997
  /* eslint-disable prettier/prettier */
  cellRenderers?: Partial<{
    [K in keyof T]: ({ value }: Readonly<{ value: T[K] }>) => ReactNode;
  }>;
  /* eslint-enable prettier/prettier */
  dataTestId?: string;
  keyProp?: string;
}

const ConditionalTooltipWrapper = ({
  message = '',
  children,
}: Readonly<{
  message?: string;
  children: React.ReactNode;
}>): React.ReactElement => (
  <>
    {message ? (
      <Tooltip side="right" label={message}>
        {children}
      </Tooltip>
    ) : (
      children
    )}
  </>
);

export const Row = <T extends object>({
  columns,
  cellRenderers,
  data,
  onClick,
  onSelect,
  withSelection = false,
  selected = false,
  selectionDisabledMessage = '',
  dataTestId = 'table',
  keyProp,
}: Readonly<RowProps<T>>): JSX.Element => {
  const isSelectionAllowed = typeof onSelect === 'function';

  return (
    <div
      data-testid={`${dataTestId}-item`}
      className={cn(cx.row, {
        [cx.selectable]: withSelection,
      })}
      onClick={(): void => onClick?.()}
    >
      {withSelection && (
        <div className={cx.cell} data-testid={`${dataTestId}-list-checkbox`}>
          <ConditionalTooltipWrapper
            message={
              (!isSelectionAllowed && !selected && selectionDisabledMessage) ||
              ''
            }
          >
            <span className={cx.checkBoxWrapper}>
              <Checkbox
                key={keyProp}
                onClick={(event): void => {
                  event.stopPropagation();
                  onSelect?.();
                }}
                disabled={!selected && !isSelectionAllowed}
                checked={!!selected}
              />
            </span>
          </ConditionalTooltipWrapper>
        </div>
      )}
      {columns.map(cell => (
        <div
          key={cell}
          className={cx.cell}
          data-testid={`${dataTestId}-list-${cell}`}
        >
          <span className={cx.cellInner}>
            {(typeof cellRenderers?.[cell] === 'function'
              ? cellRenderers[cell]?.({ value: data[cell] })
              : data[cell]) ?? '-'}
          </span>
        </div>
      ))}
    </div>
  );
};
