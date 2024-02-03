import React, { useLayoutEffect, useRef } from 'react';

import { Virtuoso } from 'react-virtuoso';

import { Flex } from '../flex';

import * as cx from './table.css';

import type { ListRange, VirtuosoProps } from 'react-virtuoso';

const DEFAULT_ROW_HIGHT = 44;

export type BodyProps<ItemProps> = VirtuosoProps<ItemProps, null> & {
  items: ItemProps[];
  loadMoreData: (range: Readonly<ListRange>) => void;
  itemContent: (index: number, item: ItemProps) => React.ReactElement;
  rowHeight?: number;
  scrollableTargetId?: string;
};

export const Body = <E extends object | undefined>({
  itemContent,
  items,
  loadMoreData,
  rowHeight = DEFAULT_ROW_HIGHT,
  scrollableTargetId = '',
  ...props
}: Readonly<BodyProps<E>>): React.ReactElement => {
  const tableReference = useRef<HTMLDivElement | null>(null);
  const scrollableTargetReference =
    useRef<VirtuosoProps<E, undefined>['customScrollParent']>();

  useLayoutEffect(() => {
    if (tableReference.current) {
      const tableVisiblePartHeight =
        window.innerHeight - tableReference.current.getBoundingClientRect().top;
      const initialItemsLimit = Math.ceil(tableVisiblePartHeight / rowHeight);
      loadMoreData({ endIndex: Math.max(initialItemsLimit, 1), startIndex: 0 });
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
      className={cx.bodyWrapper}
      ref={tableReference}
      data-testid="stake-pool-list-scroll-wrapper"
    >
      <Virtuoso
        customScrollParent={scrollableTargetReference.current}
        totalCount={items.length}
        data={items}
        rangeChanged={loadMoreData}
        className={cx.body}
        itemContent={itemContent}
        {...props}
      />
    </Flex>
  );
};
