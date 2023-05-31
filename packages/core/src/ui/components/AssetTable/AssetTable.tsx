/* eslint-disable unicorn/no-nested-ternary */
import classnames from 'classnames';
import { InfiniteScrollableTable } from '@lace/common';
import { ColumnsType } from 'antd/lib/table';
import React from 'react';
import styles from './AssetTable.module.scss';
import { useTranslate } from '@src/ui/hooks/useTranslate';

export interface IRow {
  id: string;
  logo: string;
  name: string;
  ticker: string;
  price: string;
  variation: string;
  balance: string;
  fiatBalance: string;
}

interface IAssetColumn {
  key: string;
  token: React.ReactNode;
  price: React.ReactNode;
  balance: React.ReactNode;
}

const renderCell = (
  { src, title, subtitle }: { src?: string; title: string; subtitle: string },
  subtitleColor?: 'red' | 'green' | 'neutral',
  popupView?: boolean
) => (
  <div data-testid="asset-table-cell" className={styles.cellContainer}>
    {src && <img data-testid="asset-table-cell-logo" src={src} alt="" className={styles.image} />}
    <div>
      <p data-testid="asset-table-cell-title" className={classnames(styles.title, popupView && styles.cellTitlePopup)}>
        {title}
      </p>
      <p
        data-testid="asset-table-cell-subtitle"
        className={classnames(
          styles.subtitle,
          {
            [styles.green]: subtitleColor === 'green',
            [styles.red]: subtitleColor === 'red',
            [styles.grey]: subtitleColor === 'neutral'
          },
          popupView && styles.cellSubtitlePopup
        )}
      >
        {subtitle}
      </p>
    </div>
  </div>
);

const renderRows = (rows: IRow[], popupView: boolean): IAssetColumn[] =>
  rows.map((row) => ({
    key: row.id,
    token: renderCell({ src: row.logo, title: row.name, subtitle: row.ticker || '-' }, undefined, popupView),
    price: renderCell(
      {
        title: row.price,
        subtitle: row.variation
      },
      row.variation === '0' || row.variation === '-' ? 'neutral' : row.variation.includes('+') ? 'green' : 'red',
      popupView
    ),
    balance: renderCell({ title: row.balance, subtitle: row.fiatBalance }, undefined, popupView)
  }));

export type AssetTableProps = {
  rows: IRow[];
  totalItems: number;
  scrollableTargetId: string;
  onLoad: () => void;
  onRowClick?: (id: string) => void;
  popupView?: boolean;
};

export const AssetTable = ({
  rows,
  onLoad,
  scrollableTargetId,
  totalItems,
  onRowClick,
  popupView
}: AssetTableProps): React.ReactElement => {
  const handleRowClick = (record: IAssetColumn) => ({
    onClick: () => onRowClick(record?.key)
  });
  const { t } = useTranslate();

  const columns: ColumnsType<IAssetColumn> = [
    {
      title: popupView ? '' : t('package.core.assetTable.columns.token'),
      dataIndex: 'token',
      key: 'token',
      width: '45%'
    },
    { title: popupView ? '' : t('package.core.assetTable.columns.balance'), dataIndex: 'balance', key: 'balance' }
  ];

  if (!popupView)
    columns.splice(1, 0, {
      title: t('package.core.assetTable.columns.price'),
      dataIndex: 'price',
      key: 'price'
    });

  return (
    <InfiniteScrollableTable
      data-testid="asset-table"
      columns={columns}
      className={popupView && styles.negativeMarginTable}
      dataSource={renderRows(rows, popupView)}
      onRow={onRowClick ? handleRowClick : undefined}
      infitineScrollProps={{
        dataLength: rows?.length || 0,
        next: onLoad,
        hasMore: rows?.length < (totalItems || 0),
        scrollableTarget: scrollableTargetId
      }}
    />
  );
};
