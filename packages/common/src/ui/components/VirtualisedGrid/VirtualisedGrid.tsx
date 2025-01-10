/* eslint-disable no-magic-numbers */
import React, { useLayoutEffect, useRef } from 'react';
import { ListRange, VirtuosoGrid, VirtuosoGridProps } from 'react-virtuoso';
import cn from 'classnames';
import { Box } from '@input-output-hk/lace-ui-toolkit';
import styles from './VirtualisedGrid.module.scss';

export type GridProps<T> = VirtuosoGridProps<T, null> & {
  items: T[];
  loadMoreData?: (range: Readonly<ListRange>) => void;
  itemContent: (index: number, item: T) => React.ReactElement;
  numberOfItemsPerRow?: number;
  scrollableTargetId?: string;
  testId?: string;
  tableReference?: React.Ref<HTMLDivElement>;
  columns?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
};

export const VirtualisedGrid = <T extends Record<string, unknown> | undefined>({
  itemContent,
  items,
  loadMoreData,
  scrollableTargetId = '',
  tableReference,
  testId,
  columns,
  ...props
}: GridProps<T>): React.ReactElement => {
  const scrollableTargetReference = useRef<VirtuosoGridProps<T, undefined>['customScrollParent']>();

  useLayoutEffect(() => {
    if (scrollableTargetId) {
      scrollableTargetReference.current = document.querySelector(`#${scrollableTargetId}`) as unknown as HTMLDivElement;
    }
  }, [scrollableTargetId]);

  return (
    <Box ref={tableReference} testId={testId}>
      <VirtuosoGrid<T>
        listClassName={cn(styles.grid, { [styles[`grid-${columns}`]]: columns })}
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
