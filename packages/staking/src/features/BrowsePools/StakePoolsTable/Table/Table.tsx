import { ListRange, Virtuoso } from 'react-virtuoso';

export type TableBodyProps<ItemProps> = {
  scrollableTargetRef: Parameters<typeof Virtuoso>[0]['customScrollParent'];
  items: ItemProps[];
  loadMoreData: (range: ListRange) => void;
  itemContent: (index: number, item: ItemProps) => React.ReactElement;
};

export const TableBody = function TableBody<E>({
  scrollableTargetRef,
  loadMoreData,
  itemContent,
  items,
}: TableBodyProps<E>) {
  return (
    <div data-testid="stake-pool-list-scroll-wrapper">
      <Virtuoso
        increaseViewportBy={{ bottom: 100, top: 0 }}
        customScrollParent={scrollableTargetRef}
        totalCount={items?.length}
        data={items}
        defaultItemHeight={44}
        fixedItemHeight={44}
        rangeChanged={loadMoreData}
        style={{ flex: 1 }}
        itemContent={itemContent}
      />
    </div>
  );
};
