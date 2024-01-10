import { TranslationKey } from 'features/i18n';
import { en } from 'features/i18n/translations';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../../../outside-handles-provider';
import { analyticsActionsMap } from '../analytics';
import { TableHeader } from '../Table/TableHeader';
import { Columns, SortDirection, SortField, StakePoolSortOptions, TranslationsFor } from '../types';
import { config } from '../utils';

const isSortingAvailable = (value: string) => Object.keys(SortField).includes(value);

export interface TableHeaders {
  label: string;
  value: Columns;
  tooltipText?: string;
}

export type StakePoolTableHeaderBrowserProps = {
  setActiveSort: (props: StakePoolSortOptions) => void;
  activeSort: StakePoolSortOptions;
  translations: TranslationsFor<Columns>;
};

export const StakePoolTableHeaderBrowser = ({
  translations,
  setActiveSort,
  activeSort,
}: StakePoolTableHeaderBrowserProps) => {
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

  const onSortChange = (field: Columns) => {
    // TODO: remove once updated on sdk side (LW-9530)
    if (!Object.keys(SortField).includes(field)) return;
    const order =
      field === activeSort?.field && activeSort?.order === SortDirection.asc ? SortDirection.desc : SortDirection.asc;

    analytics.sendEventToPostHog(analyticsActionsMap[field]);
    setActiveSort({ field: field as unknown as SortField, order });
  };

  const isActiveSortItem = (value: string) => value === activeSort?.field;

  return (
    <TableHeader
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
