/* eslint-disable react/no-multi-comp */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Tooltip } from '@lace/ui';
import cn from 'classnames';
import React from 'react';
// import { config } from '../utils';
import CheckboxChecked from './assets/checkbox-checked.component.svg';
import Checkbox from './assets/checkbox.component.svg';
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
  cellRenderers?: Record<E, React.FunctionComponent<{ value?: string | undefined }>>;
  dataTestId?: string;
};

const ConditionalTooltipWrapper = ({ message = '', children }: { message?: string; children: React.ReactNode }) => (
  <>{!message ? children : <Tooltip label={message}>{children}</Tooltip>}</>
);

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
          <ConditionalTooltipWrapper message={(!selectable && selectionDisabledMessage) || ''}>
            {/* TODO: replace with the one imported from ui toolkit */}
            <span
              onClick={(event) => {
                event.stopPropagation();
                onSelect?.();
              }}
              className={cn(styles.checkboxContainer, { [styles.disabled]: !selectable, [styles.selected]: selected })}
            >
              {selected ? (
                <CheckboxChecked className={cn(styles.checkbox, styles.selected)} />
              ) : (
                <Checkbox className={cn(styles.checkbox, { [styles.disabled]: !selectable })} />
              )}
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
