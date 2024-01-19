import { useLayoutEffect, useRef } from 'react';
import { ListRange, Virtuoso } from 'react-virtuoso';

const DEFAULT_ROW_HIGHT = 44;

export type TableBodyProps<ItemProps> = {
  items: ItemProps[];
  loadMoreData: (range: ListRange) => void;
  itemContent: (index: number, item: ItemProps) => React.ReactElement;
  rowHeight?: number;
  scrollableTargetId: string;
};

export const TableBody = function TableBody<E>({
  itemContent,
  items,
  loadMoreData,
  rowHeight = DEFAULT_ROW_HIGHT,
  scrollableTargetId,
}: TableBodyProps<E>) {
  const tableRef = useRef<HTMLDivElement | null>(null);
  const scrollableTargetRef = useRef<Parameters<typeof Virtuoso>[0]['customScrollParent']>();

  useLayoutEffect(() => {
    scrollableTargetRef.current = document.getElementById(scrollableTargetId) || undefined;
    if (tableRef?.current) {
      const tableVisiblePartHeight = window.innerHeight - tableRef?.current.getBoundingClientRect().top;
      const initialItemsLimit = Math.ceil(tableVisiblePartHeight / rowHeight);
      loadMoreData({ endIndex: initialItemsLimit, startIndex: 0 });
    }
  }, [loadMoreData, rowHeight, scrollableTargetId]);

  return (
    <div ref={tableRef} data-testid="stake-pool-list-scroll-wrapper">
      <Virtuoso
        increaseViewportBy={{ bottom: 100, top: 0 }}
        customScrollParent={scrollableTargetRef.current}
        totalCount={items?.length}
        data={items}
        rangeChanged={loadMoreData}
        style={{ flex: 1 }}
        itemContent={itemContent}
      />
    </div>
  );
};
