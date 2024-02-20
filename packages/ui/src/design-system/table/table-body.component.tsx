import React, { useEffect, useLayoutEffect, useRef } from 'react';

import { Virtuoso } from 'react-virtuoso';

import { Flex } from '../flex';

import { useVisibleItemsCount } from './hooks';
import * as cx from './table.css';

import type { ListRange, VirtuosoProps } from 'react-virtuoso';

const DEFAULT_ROW_HIGHT = 44;

export type BodyProps<T> = VirtuosoProps<T, null> & {
  items: T[];
  loadMoreData: (range: Readonly<ListRange>) => void;
  itemContent: (index: number, item: T) => React.ReactElement;
  rowHeight?: number;
  scrollableTargetId?: string;
};

export const Body = <T extends object | undefined>({
  itemContent,
  items,
  loadMoreData,
  rowHeight = DEFAULT_ROW_HIGHT,
  scrollableTargetId = '',
  ...props
}: Readonly<BodyProps<T>>): React.ReactElement => {
  const tableReference = useRef<HTMLDivElement | null>(null);
  const scrollableTargetReference =
    useRef<VirtuosoProps<T, undefined>['customScrollParent']>();

  useLayoutEffect(() => {
    if (scrollableTargetId) {
      // eslint-disable-next-line functional/immutable-data
      scrollableTargetReference.current = document.querySelector(
        `#${scrollableTargetId}`,
      ) as unknown as HTMLDivElement;
    }
  }, [scrollableTargetId]);

  const initialItemsLimit = useVisibleItemsCount({
    rowHeight,
    containerRef: tableReference,
  });

  useEffect(() => {
    if (initialItemsLimit !== undefined) {
      loadMoreData({ endIndex: Math.max(initialItemsLimit, 1), startIndex: 0 });
    }
  }, [initialItemsLimit, loadMoreData]);

  return (
    <Flex
      h="$fill"
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
