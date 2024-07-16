/* eslint-disable react/no-multi-comp */
import { Table, Skeleton, SkeletonProps } from 'antd';
import cn from 'classnames';
import InfiniteScroll, { Props as InfiniteScrollProps } from 'react-infinite-scroll-component';
import React from 'react';
import styles from './InfiniteScrollableTable.module.scss';

export type InfiniteScrollableTableProps = Omit<React.ComponentProps<typeof Table>, 'children'> & {
  infiniteScrollProps: Omit<InfiniteScrollProps, 'children' | 'loader'>;
  infiniteScrollContainerClass?: string;
  loaderConfig?: SkeletonProps;
};

const TableBodyWrapper = ({
  children,
  loaderConfig,
  infiniteScrollContainerClass,
  ...props
}: Omit<InfiniteScrollProps, 'loader'> & { loaderConfig?: SkeletonProps; infiniteScrollContainerClass?: string }) => (
  <InfiniteScroll
    className={cn(styles.infiniteScrollContainer, { [infiniteScrollContainerClass]: infiniteScrollContainerClass })}
    {...props}
    loader={<Skeleton {...loaderConfig} />}
  >
    {children}
  </InfiniteScroll>
);

// Caution: setting this as a new object on every render inline re-creates the entire table body
const tableComponents = {
  body: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    row: (rowProps: any) => <tr {...rowProps} className={styles.rows} data-testid="infinite-scrollable-table-row" />
  }
};

export const InfiniteScrollableTable = ({
  infiniteScrollProps,
  infiniteScrollContainerClass,
  loaderConfig,
  ...props
}: InfiniteScrollableTableProps): React.ReactElement => (
  <TableBodyWrapper
    {...infiniteScrollProps}
    loaderConfig={loaderConfig}
    infiniteScrollContainerClass={infiniteScrollContainerClass}
  >
    <div data-testid="infinite-scrollable-table" className={styles.tableContainer}>
      <Table {...props} pagination={false} components={tableComponents} />
    </div>
  </TableBodyWrapper>
);
