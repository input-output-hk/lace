import React, { useLayoutEffect, useRef } from 'react';

import { Virtuoso } from 'react-virtuoso';

import { Flex } from '../flex';

import * as cx from './table.css';

import type { ListRange, VirtuosoProps } from 'react-virtuoso';

const DEFAULT_ROW_HIGHT = 44;

export type TableBodyProps<ItemProps> = VirtuosoProps<ItemProps, null> & {
  items: ItemProps[];
  loadMoreData: (range: Readonly<ListRange>) => void;
  itemContent: (index: number, item: ItemProps) => React.ReactElement;
  rowHeight?: number;
  scrollableTargetId?: string;
};

export const TableBody = <E extends object | undefined>({
  itemContent,
  items,
  loadMoreData,
  rowHeight = DEFAULT_ROW_HIGHT,
  scrollableTargetId = '',
  ...props
}: Readonly<TableBodyProps<E>>): React.ReactElement => {
  const tableReference = useRef<HTMLDivElement | null>(null);
  const scrollableTargetReference =
    useRef<Parameters<typeof Virtuoso>[0]['customScrollParent']>();

  useLayoutEffect(() => {
    if (tableReference.current) {
      const tableVisiblePartHeight =
        window.innerHeight - tableReference.current.getBoundingClientRect().top;
      const initialItemsLimit = Math.ceil(tableVisiblePartHeight / rowHeight);
      loadMoreData({ endIndex: initialItemsLimit, startIndex: 0 });
    }
  }, [loadMoreData, rowHeight, scrollableTargetId]);

  useLayoutEffect(() => {
    if (scrollableTargetId) {
      // eslint-disable-next-line functional/immutable-data
      scrollableTargetReference.current = document.querySelector(
        `#${scrollableTargetId}`,
      ) as unknown as HTMLDivElement;
    }
  }, [loadMoreData, rowHeight, scrollableTargetId]);

  return (
    <Flex
      className={cx.body}
      ref={tableReference}
      data-testid="stake-pool-list-scroll-wrapper"
    >
      <Virtuoso
        customScrollParent={scrollableTargetReference.current}
        totalCount={items.length}
        data={items}
        rangeChanged={loadMoreData}
        style={{ flex: 1 }}
        itemContent={itemContent}
        {...props}
      />
    </Flex>
  );
};
