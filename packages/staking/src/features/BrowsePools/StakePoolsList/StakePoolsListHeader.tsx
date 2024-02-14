import { Table } from '@lace/ui';
import {
  MetricType,
  SortDirection,
  SortField,
  StakePoolSortOptions,
  TranslationsFor,
} from 'features/BrowsePools/types';
import { TranslationKey } from 'features/i18n';
import { en } from 'features/i18n/translations';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../../outside-handles-provider';
import { analyticsActionsMap } from '../analytics';
import { config } from './config';

const isSortingAvailable = (value: string) => Object.keys(SortField).includes(value);

export interface TableHeaders {
  label: string;
  value: MetricType;
  tooltipText?: string;
}

export type StakePoolsListHeaderProps = {
  setActiveSort: (props: StakePoolSortOptions) => void;
  activeSort: StakePoolSortOptions;
  translations: TranslationsFor<MetricType>;
};

export const StakePoolsListHeader = ({ translations, setActiveSort, activeSort }: StakePoolsListHeaderProps) => {
  const { t } = useTranslation();
  const { analytics } = useOutsideHandles();
  const headers: TableHeaders[] = config.columns.map((column) => {
    const translationKey = `browsePools.stakePoolTableBrowser.tableHeader.${column}.tooltip` as TranslationKey;
    const tooltipText = t(translationKey);
    return {
      label: translations[column],
      ...(translationKey in en && { tooltipText }),
      value: column,
    };
  });

  const onSortChange = (field: MetricType) => {
    // TODO: remove once updated on sdk side (LW-9530)
    if (Object.keys(SortField).includes(field)) {
      const sortField = field as unknown as SortField;
      const order =
        sortField === activeSort?.field && activeSort?.order === SortDirection.asc
          ? SortDirection.desc
          : SortDirection.asc;

      analytics.sendEventToPostHog(analyticsActionsMap[field]);
      setActiveSort({ field: sortField, order });
    }
  };

  const isActiveSortItem = (value: string) => value === activeSort?.field;

  return (
    <Table.Header<MetricType>
      dataTestId="stake-pool"
      headers={headers}
      isActiveSortItem={isActiveSortItem}
      isSortingAvailable={isSortingAvailable}
      onSortChange={onSortChange}
      order={activeSort?.order}
      withSelection
    />
  );
};
