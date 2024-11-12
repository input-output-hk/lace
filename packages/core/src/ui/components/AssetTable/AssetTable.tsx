/* eslint-disable unicorn/no-nested-ternary */
import classnames from 'classnames';
import { InfiniteScrollableTable, useHasScrollBar } from '@lace/common';
import { ColumnsType } from 'antd/lib/table';
import React, { useMemo, useState } from 'react';
import styles from './AssetTable.module.scss';
import { useTranslation } from 'react-i18next';
import { ImageWithFallback } from '../ImageWithFallback';

export interface IRow {
  id: string;
  logo: string;
  defaultLogo: string;
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
  {
    src,
    defaultSrc,
    title,
    subtitle,
    testIdForTitle,
    testIdForSubtitle
  }: {
    src?: string;
    defaultSrc?: string;
    title: string;
    subtitle: string;
    testIdForTitle?: string;
    testIdForSubtitle?: string;
  },
  subtitleColor?: 'red' | 'green' | 'neutral',
  popupView?: boolean
) => (
  <div data-testid="asset-table-cell" className={styles.cellContainer}>
    {src && (
      <ImageWithFallback
        data-testid="asset-table-cell-logo"
        src={src}
        fallbackSrc={defaultSrc}
        alt=""
        className={styles.image}
      />
    )}
    <div>
      <p
        data-testid={testIdForTitle ? `token-table-cell-${testIdForTitle}` : 'asset-table-cell-title'}
        className={classnames(styles.title, popupView && styles.cellTitlePopup)}
      >
        {title}
      </p>
      <p
        data-testid={testIdForSubtitle ? `token-table-cell-${testIdForSubtitle}` : 'asset-table-cell-subtitle'}
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
    token: renderCell(
      {
        src: row.logo,
        defaultSrc: row.defaultLogo,
        title: row.name,
        subtitle: row.ticker || '-',
        testIdForTitle: 'name',
        testIdForSubtitle: 'ticker'
      },
      undefined,
      popupView
    ),
    price: renderCell(
      {
        title: row.price,
        subtitle: row.variation,
        testIdForTitle: 'price',
        testIdForSubtitle: 'price-variation'
      },
      row.variation === '0' || row.variation === '-' ? 'neutral' : row.variation.includes('+') ? 'green' : 'red',
      popupView
    ),
    balance: renderCell(
      {
        title: row.balance,
        subtitle: row.fiatBalance,
        testIdForTitle: 'balance',
        testIdForSubtitle: 'fiat-balance'
      },
      undefined,
      popupView
    )
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
    onClick: () => onRowClick?.(record?.key)
  });
  const { t } = useTranslation();

  const columns: ColumnsType<IAssetColumn> = useMemo(() => {
    const result = [
      {
        title: popupView ? '' : t('core.assetTable.columns.token'),
        dataIndex: 'token',
        key: 'token',
        width: '45%'
      },
      { title: popupView ? '' : t('core.assetTable.columns.balance'), dataIndex: 'balance', key: 'balance' }
    ];

    if (!popupView)
      result.splice(1, 0, {
        title: t('core.assetTable.columns.price'),
        dataIndex: 'price',
        key: 'price'
      });

    return result;
  }, [popupView, t]);

  const [hasScrollBar, setHasScrollBar] = useState<boolean>(false);
  useHasScrollBar({ current: document.querySelector(`#${scrollableTargetId}`) }, (withScroll) =>
    setHasScrollBar(withScroll && popupView)
  );

  const dataSource = useMemo(() => renderRows(rows, popupView), [rows, popupView]);

  return (
    <InfiniteScrollableTable
      data-testid="asset-table"
      columns={columns}
      dataSource={dataSource}
      onRow={onRowClick ? handleRowClick : undefined}
      infiniteScrollContainerClass={hasScrollBar && styles.scrollContainer}
      infiniteScrollProps={{
        dataLength: rows?.length || 0,
        next: onLoad,
        hasMore: rows?.length < (totalItems || 0),
        scrollableTarget: scrollableTargetId
      }}
    />
  );
};
