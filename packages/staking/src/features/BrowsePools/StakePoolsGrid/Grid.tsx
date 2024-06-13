import { Flex } from '@input-output-hk/lace-ui-toolkit';
import { useLayoutEffect, useRef } from 'react';
import { ListRange, VirtuosoGrid, VirtuosoGridProps } from 'react-virtuoso';
import * as cx from './StakePoolsGrid.css';

export type GridProps<T> = VirtuosoGridProps<T, null> & {
  items: T[];
  loadMoreData: (range: Readonly<ListRange>) => void;
  itemContent: (index: number, item: T) => React.ReactElement;
  numberOfItemsPerRow?: number;
  scrollableTargetId?: string;
  tableReference?: React.Ref<HTMLDivElement>;
};

export const Grid = <T extends Record<string, unknown> | undefined>({
  itemContent,
  items,
  loadMoreData,
  scrollableTargetId = '',
  tableReference,
  ...props
}: GridProps<T>) => {
  const scrollableTargetReference = useRef<VirtuosoGridProps<T, undefined>['customScrollParent']>();

  useLayoutEffect(() => {
    if (scrollableTargetId) {
      scrollableTargetReference.current = document.querySelector(`#${scrollableTargetId}`) as unknown as HTMLDivElement;
    }
  }, [scrollableTargetId]);

  return (
    <Flex h="$fill" ref={tableReference} data-testid="stake-pool-list-scroll-wrapper">
      <VirtuosoGrid<T>
        listClassName={cx.grid}
        data={items}
        customScrollParent={scrollableTargetReference.current}
        totalCount={items.length}
        className={cx.body}
        rangeChanged={loadMoreData}
        itemContent={itemContent}
        {...props}
      />
    </Flex>
  );
};
