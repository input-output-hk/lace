/* eslint-disable react/no-multi-comp */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Checkbox, Tooltip } from '@lace/ui';
import cn from 'classnames';
import React from 'react';
import * as styles from './Table.css';

export type TableRowProps<E extends string> = {
  columns: E[];
  data: { [key in E]?: string | undefined };
  selectionDisabledMessage?: string;
  withSelection?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onClick?: () => void;
  cellRenderers?: Partial<Record<E, React.FunctionComponent<{ value?: string }>>>;
  dataTestId?: string;
  focused?: boolean;
};

const ConditionalTooltipWrapper = ({ message = '', children }: { message?: string; children: React.ReactNode }) => (
  <>
    {!message ? (
      children
    ) : (
      <Tooltip side="right" label={message}>
        {children}
      </Tooltip>
    )}
  </>
);

// TODO: migrate into the ui package (LW-9531)
export const TableRow = function TableRow<E extends string>({
  columns,
  cellRenderers,
  data,
  onClick,
  onSelect,
  withSelection,
  selectable,
  selected,
  selectionDisabledMessage = '',
  dataTestId = 'table',
  focused,
}: TableRowProps<E>): React.ReactElement {
  return (
    <div
      data-testid={`${dataTestId}-item`}
      className={cn(styles.row, {
        [styles.selectable!]: withSelection,
      })}
      onClick={() => onClick?.()}
    >
      {withSelection && (
        <div className={styles.cell} data-testid={`${dataTestId}-list-checkbox`}>
          <ConditionalTooltipWrapper message={(!selectable && !selected && selectionDisabledMessage) || ''}>
            <span>
              <Checkbox
                autoFocus={!!focused}
                onClick={(event) => {
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
      {columns.map((cell, index) => (
        <div key={`${cell}-${index}`} className={styles.cell} data-testid={`${dataTestId}-list-${cell}`}>
          <span className={styles.cellInner}>
            {cellRenderers?.[cell]?.({ value: data[cell] }) || data[cell] || '-'}
          </span>
        </div>
      ))}
    </div>
  );
};
