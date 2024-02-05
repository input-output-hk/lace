/* eslint-disable react/no-multi-comp */
import { Flex, useVisibleItemsCount } from '@lace/ui';
import { forwardRef, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { ListRange, VirtuosoGrid, VirtuosoGridProps } from 'react-virtuoso';
import * as cx from './StakePoolsGrid.css';

export type GridProps<T> = VirtuosoGridProps<T, null> & {
  items: T[];
  loadMoreData: (range: Readonly<ListRange>) => void;
  itemContent: (index: number, item: T) => React.ReactElement;
  rowHeight: number;
  numberOfItemsPerRow?: number;
  scrollableTargetId?: string;
};

export const Grid = <T extends Record<string, unknown> | undefined>({
  itemContent,
  items,
  loadMoreData,
  rowHeight,
  numberOfItemsPerRow,
  scrollableTargetId = '',
}: GridProps<T>) => {
  const tableReference = useRef<HTMLDivElement | null>(null);
  const scrollableTargetReference = useRef<VirtuosoGridProps<T, undefined>['customScrollParent']>();

  const gridComponents: VirtuosoGridProps<T>['components'] = useMemo(
    () => ({
      Item: ({ children, ...itemProps }) => <div {...itemProps}>{children}</div>,
      List: forwardRef(({ children, ...listProps }, ref) => (
        <div ref={ref} {...listProps} className={cx.grid}>
          {children}
        </div>
      )),
    }),
    []
  );

  useLayoutEffect(() => {
    if (scrollableTargetId) {
      scrollableTargetReference.current = document.querySelector(`#${scrollableTargetId}`) as unknown as HTMLDivElement;
    }
  }, [scrollableTargetId]);

  const initialRowsCount = useVisibleItemsCount({
    containerRef: tableReference,
    rowHeight,
  });

  useEffect(() => {
    if (initialRowsCount !== undefined && numberOfItemsPerRow !== undefined) {
      loadMoreData({ endIndex: Math.max(initialRowsCount, 1) * numberOfItemsPerRow, startIndex: 0 });
    }
  }, [initialRowsCount, loadMoreData, numberOfItemsPerRow, rowHeight]);

  return (
    <Flex h="$fill" ref={tableReference} data-testid="stake-pool-list-scroll-wrapper">
      {items.length > 0 && scrollableTargetReference.current && (
        <VirtuosoGrid<T>
          style={{ height: 500 }}
          data={items}
          customScrollParent={scrollableTargetReference.current}
          totalCount={items.length}
          className={cx.body}
          components={gridComponents}
          rangeChanged={loadMoreData}
          itemContent={itemContent}
        />
      )}
    </Flex>
  );
};
