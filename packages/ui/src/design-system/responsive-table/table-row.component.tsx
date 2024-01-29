/* eslint-disable react/no-multi-comp */
import React from 'react';

import { Checkbox, Tooltip } from '@lace/ui';
import cn from 'classnames';

import * as cx from './table.css';

export interface TableRowProps<E extends string> {
  columns: E[];
  data: { [key in E]?: string | undefined };
  selectionDisabledMessage?: string;
  withSelection?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onClick?: () => void;
  cellRenderers?: Partial<
    Record<E, React.FunctionComponent<{ value?: string }>>
  >;
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

export const TableRow = <E extends string>({
  columns,
  cellRenderers,
  data,
  onClick,
  onSelect,
  withSelection = false,
  selectable = true,
  selected = false,
  selectionDisabledMessage = '',
  dataTestId = 'table',
  keyProp,
}: Readonly<TableRowProps<E>>): JSX.Element => (
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
          message={(!selectable && !selected && selectionDisabledMessage) || ''}
        >
          <span className={cx.checkBoxWrapper}>
            <Checkbox
              key={keyProp}
              onClick={(event): void => {
                event.stopPropagation();
                onSelect?.();
              }}
              disabled={!selected && !selectable}
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
          {typeof cellRenderers?.[cell] === 'function'
            ? cellRenderers[cell]?.({ value: data[cell] })
            : data[cell] ?? '-'}
        </span>
      </div>
    ))}
  </div>
);
