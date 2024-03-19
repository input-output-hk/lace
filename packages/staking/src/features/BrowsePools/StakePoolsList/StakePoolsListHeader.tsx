import { Table } from '@lace/ui';
import { SortField, StakePoolSortOptions, TranslationsFor } from 'features/BrowsePools/types';
import { TranslationKey } from 'features/i18n';
import { en } from 'features/i18n/translations';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../../outside-handles-provider';
import { analyticsActionsMap } from '../analytics';
import { config } from './config';

export interface TableHeaders {
  label: string;
  value: SortField;
  tooltipText?: string;
}

export type StakePoolsListHeaderProps = {
  setActiveSort: (props: StakePoolSortOptions) => void;
  activeSort: StakePoolSortOptions;
  translations: TranslationsFor<SortField>;
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

  const onSortChange = (field: SortField) => {
    const sortField = field as unknown as SortField;
    const order = sortField === activeSort?.field && activeSort?.order === 'asc' ? 'desc' : 'asc';

    analytics.sendEventToPostHog(analyticsActionsMap[field]);
    setActiveSort({ field: sortField, order });
  };

  const isActiveSortItem = (value: string) => value === activeSort?.field;

  return (
    <Table.Header<SortField>
      dataTestId="stake-pool"
      headers={headers}
      isActiveSortItem={isActiveSortItem}
      onSortChange={onSortChange}
      order={activeSort?.order}
      withSelection
    />
  );
};
