/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Tooltip } from 'antd';
import cn from 'classnames';
import { TranslationKey } from 'features/i18n';
import { en } from 'features/i18n/translations';
import { useTranslation } from 'react-i18next';
import { Columns, SortField, StakePoolSortOptions, TranslationsFor } from '../types';
import { config } from '../utils';
import * as styles from './StakePoolTableBrowser.css';

const isSortingAvailable = (value: string) => Object.keys(SortField).includes(value);

export interface TableHeaders {
  label: string;
  value: Columns;
  tooltipText?: string;
}

export type StakePoolTableHeaderBrowserProps = {
  isActiveSortItem: (value: string) => boolean;
  onSortChange: (field: Columns) => void;
  activeSort: StakePoolSortOptions;
  translations: TranslationsFor<Columns>;
};

export const StakePoolTableHeaderBrowser = ({
  translations,
  isActiveSortItem,
  onSortChange,
  activeSort,
}: StakePoolTableHeaderBrowserProps) => {
  const { t } = useTranslation();
  const headers: TableHeaders[] = config.columns.map((column) => {
    const translationKey = `browsePools.stakePoolTableBrowser.tableHeader.${column}.tooltip` as TranslationKey;
    const tooltipText = t(translationKey);
    return {
      label: translations[column],
      ...(translationKey in en && { tooltipText }),
      value: column,
    };
  });

  return (
    <div data-testid="stake-pool-list-header" className={cn(styles.header, {})}>
      {headers.map(({ label, value, tooltipText }) => (
        <div
          className={cn(styles.headerItem, {
            [styles.withAction!]: isSortingAvailable(value),
            [styles.active!]: isActiveSortItem(value),
          })}
          key={value}
          onClick={() => onSortChange(value)}
          data-testid={`stake-pool-list-header-${value}`}
        >
          <Tooltip destroyTooltipOnHide title={tooltipText}>
            {label}
          </Tooltip>
          {isSortingAvailable(value) && isActiveSortItem(value) && (
            <div
              className={cn(styles.triangle, styles[activeSort?.order])}
              data-testid={`stake-pool-sort-order-${activeSort?.order}`}
            />
          )}
        </div>
      ))}
    </div>
  );
};
