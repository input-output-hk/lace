/* eslint-disable no-magic-numbers */
import React, { useLayoutEffect, useRef } from 'react';
import { ListRange, VirtuosoGrid, VirtuosoGridProps } from 'react-virtuoso';
import cn from 'classnames';
import styles from './VirtualisedGrid.module.scss';

export const fixedVirtualisedGridColumns = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type VirtualisedGridColumns = (typeof fixedVirtualisedGridColumns)[number];

export const getTypedColumn = (column: number): VirtualisedGridColumns | undefined =>
  fixedVirtualisedGridColumns.find((c) => c === column);

export type GridProps<T> = VirtuosoGridProps<T, null> & {
  items: T[];
  loadMoreData?: (range: Readonly<ListRange>) => void;
  itemContent: (index: number, item: T) => React.ReactElement;
  numberOfItemsPerRow?: number;
  scrollableTargetId?: string;
  testId?: string;
  tableReference?: React.Ref<HTMLDivElement>;
  columns?: VirtualisedGridColumns;
};

export const VirtualisedGrid = <T extends Record<string, unknown> | undefined>({
  itemContent,
  items,
  loadMoreData,
  scrollableTargetId = '',
  tableReference,
  testId,
  columns,
  ...props
}: GridProps<T>): React.ReactElement => {
  const scrollableTargetReference = useRef<VirtuosoGridProps<T, undefined>['customScrollParent']>();

  useLayoutEffect(() => {
    if (scrollableTargetId) {
      scrollableTargetReference.current = document.querySelector(`#${scrollableTargetId}`) as unknown as HTMLDivElement;
    }
  }, [scrollableTargetId]);

  return (
    <div ref={tableReference} data-testid={testId}>
      <VirtuosoGrid<T>
        listClassName={cn(styles.grid, { [styles[`grid-${columns}`]]: columns })}
        data={items}
        customScrollParent={scrollableTargetReference.current}
        totalCount={items.length}
        className={styles.body}
        rangeChanged={loadMoreData}
        itemContent={itemContent}
        {...props}
      />
    </div>
  );
};
