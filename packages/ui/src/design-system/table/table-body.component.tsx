import React, { useLayoutEffect, useRef } from 'react';

import { Virtuoso } from 'react-virtuoso';

import { Flex } from '../flex';

import * as cx from './table.css';

import type { ListRange, VirtuosoProps } from 'react-virtuoso';

export type BodyProps<T> = VirtuosoProps<T, null> & {
  items: T[] | undefined;
  loadMoreData: (range: Readonly<ListRange>) => void;
  itemContent: (index: number, item: T) => React.ReactElement;
  scrollableTargetId?: string;
  tableReference?: React.Ref<HTMLDivElement>;
};

export const Body = <T extends object | undefined>({
  itemContent,
  items,
  loadMoreData,
  scrollableTargetId = '',
  tableReference,
  ...props
}: Readonly<BodyProps<T>>): React.ReactElement => {
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

  return (
    <Flex
      h="$fill"
      ref={tableReference}
      data-testid="stake-pool-list-scroll-wrapper"
    >
      <Virtuoso
        customScrollParent={scrollableTargetReference.current}
        data={items}
        rangeChanged={loadMoreData}
        className={cx.body}
        itemContent={itemContent}
        {...props}
      />
    </Flex>
  );
};
