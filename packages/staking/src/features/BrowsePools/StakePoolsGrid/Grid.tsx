/* eslint-disable no-console */
/* eslint-disable react/no-multi-comp */
import { Flex, useVisibleItemsCount } from '@lace/ui';
import debounce from 'lodash/debounce';
import { RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ListRange, VirtuosoGrid, VirtuosoGridProps } from 'react-virtuoso';
import useResizeObserver from 'use-resize-observer';
import * as cx from './StakePoolsGrid.css';

export type GridProps<T> = VirtuosoGridProps<T, null> & {
  items: T[];
  loadMoreData: (range: Readonly<ListRange>) => void;
  itemContent: (index: number, item: T) => React.ReactElement;
  rowHeight: number;
  numberOfItemsPerRow?: number;
  scrollableTargetId?: string;
  parentRef: RefObject<HTMLDivElement>;
};

const DEFAULT_DEBOUNCE = 200;

export const Grid = <T extends Record<string, unknown> | undefined>({
  itemContent,
  items,
  loadMoreData,
  rowHeight,
  numberOfItemsPerRow,
  scrollableTargetId = '',
  parentRef,
}: GridProps<T>) => {
  const tableReference = useRef<HTMLDivElement | null>(null);
  const scrollableTargetReference = useRef<VirtuosoGridProps<T, undefined>['customScrollParent']>();
  const [overscan, setOverscan] = useState({ main: 0, reverse: 0 });

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
    if (tableReference && initialRowsCount !== undefined && numberOfItemsPerRow !== undefined) {
      loadMoreData({ endIndex: Math.max(initialRowsCount, 1) * numberOfItemsPerRow, startIndex: 0 });
    }
  }, [initialRowsCount, loadMoreData, numberOfItemsPerRow, rowHeight]);

  const updateGridOverscan = useCallback(() => {
    if (!tableReference?.current || !parentRef?.current) return;
    // VirtuosoGrid won't render more items in case it's top position (visible items count) changes, force it manually via overscan value
    const tableVsParentHeightDiff =
      parentRef.current.getBoundingClientRect().height - tableReference.current.getBoundingClientRect().height;
    setOverscan({ main: tableVsParentHeightDiff, reverse: 0 });
  }, [parentRef]);

  useLayoutEffect(() => {
    updateGridOverscan();
  }, [updateGridOverscan]);

  const onResize = useMemo(
    () => debounce(updateGridOverscan, DEFAULT_DEBOUNCE, { leading: true }),
    [updateGridOverscan]
  );

  useResizeObserver<HTMLElement>({ onResize, ref: parentRef });

  return (
    <Flex h="$fill" ref={tableReference} data-testid="stake-pool-list-scroll-wrapper">
      {items.length > 0 && scrollableTargetReference.current && (
        <VirtuosoGrid<T>
          overscan={overscan}
          listClassName={cx.grid}
          data={items}
          customScrollParent={scrollableTargetReference.current}
          totalCount={items.length}
          className={cx.body}
          rangeChanged={loadMoreData}
          itemContent={itemContent}
        />
      )}
    </Flex>
  );
};
