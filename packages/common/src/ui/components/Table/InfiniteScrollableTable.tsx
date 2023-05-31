/* eslint-disable react/no-multi-comp */
import { Table, Skeleton, SkeletonProps } from 'antd';
import InfiniteScroll, { Props as InfiniteScrollProps } from 'react-infinite-scroll-component';
import React from 'react';
import styles from './InfiniteScrollableTable.module.scss';

export type InfiniteScrollableTableProps = Omit<React.ComponentProps<typeof Table>, 'children'> & {
  infitineScrollProps: Omit<InfiniteScrollProps, 'children' | 'loader'>;
  loaderConfig?: SkeletonProps;
};

const TableBodyWrapper = ({
  children,
  loaderConfig,
  ...props
}: Omit<InfiniteScrollProps, 'loader'> & { loaderConfig?: SkeletonProps }) => (
  <InfiniteScroll className={styles.infinitScrollContainer} {...props} loader={<Skeleton {...loaderConfig} />}>
    {children}
  </InfiniteScroll>
);

export const InfiniteScrollableTable = ({
  infitineScrollProps,
  loaderConfig,
  ...props
}: InfiniteScrollableTableProps): React.ReactElement => (
  <TableBodyWrapper {...infitineScrollProps} loaderConfig={loaderConfig}>
    <div data-testid="infinite-scrollable-table" className={styles.tableContainer}>
      <Table
        {...props}
        pagination={false}
        components={{
          body: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            row: (rowProps: any) => (
              <tr {...rowProps} className={styles.rows} data-testid="infinite-scrollable-table-row" />
            )
          }
        }}
      />
    </div>
  </TableBodyWrapper>
);
