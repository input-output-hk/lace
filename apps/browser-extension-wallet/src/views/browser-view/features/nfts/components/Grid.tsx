import { Box } from '@input-output-hk/lace-ui-toolkit';
import React, { useLayoutEffect, useRef } from 'react';
import { ListRange, VirtuosoGrid, VirtuosoGridProps } from 'react-virtuoso';
import styles from './Grid.module.scss';

export type GridProps<T> = VirtuosoGridProps<T, null> & {
  items: T[];
  loadMoreData?: (range: Readonly<ListRange>) => void;
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
}: GridProps<T>): React.ReactElement => {
  const scrollableTargetReference = useRef<VirtuosoGridProps<T, undefined>['customScrollParent']>();

  useLayoutEffect(() => {
    if (scrollableTargetId) {
      scrollableTargetReference.current = document.querySelector(`#${scrollableTargetId}`) as unknown as HTMLDivElement;
    }
  }, [scrollableTargetId]);

  return (
    <Box ref={tableReference} testId="stake-pool-list-scroll-wrapper">
      <VirtuosoGrid<T>
        listClassName={styles.grid}
        data={items}
        customScrollParent={scrollableTargetReference.current}
        totalCount={items.length}
        className={styles.body}
        rangeChanged={loadMoreData}
        itemContent={itemContent}
        {...props}
      />
    </Box>
  );
};
