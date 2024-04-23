import { Table } from '@lace/ui';
import { SortField, StakePoolSortOptions } from 'features/BrowsePools/types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../../outside-handles-provider';
import { analyticsActionsMap } from '../analytics';
import { getDefaultSortOrderByField } from '../utils';
import { config } from './config';

export interface TableHeaders {
  label: string;
  value: SortField;
  tooltipText?: string;
}

export type StakePoolsListHeaderProps = {
  setActiveSort: (props: StakePoolSortOptions) => void;
  activeSort: StakePoolSortOptions;
};

export const StakePoolsListHeader = ({ setActiveSort, activeSort }: StakePoolsListHeaderProps) => {
  const { t } = useTranslation();

  const tableHeaderTranslations: Record<SortField, { label: string; tooltipText: string }> = useMemo(
    () => ({
      blocks: {
        label: t('browsePools.tableHeaders.blocks'),
        tooltipText: t('browsePools.tooltips.blocks'),
      },
      cost: {
        label: t('browsePools.tableHeaders.cost'),
        tooltipText: t('browsePools.tooltips.cost'),
      },
      liveStake: {
        label: t('browsePools.tableHeaders.liveStake'),
        tooltipText: t('browsePools.tooltips.liveStake'),
      },
      margin: {
        label: t('browsePools.tableHeaders.margin'),
        tooltipText: t('browsePools.tooltips.margin'),
      },
      pledge: {
        label: t('browsePools.tableHeaders.pledge'),
        tooltipText: t('browsePools.tooltips.pledge'),
      },
      ros: {
        label: t('browsePools.tableHeaders.ros'),
        tooltipText: t('browsePools.tooltips.ros'),
      },
      saturation: {
        label: t('browsePools.tableHeaders.saturation'),
        tooltipText: t('browsePools.tooltips.saturation'),
      },

      ticker: {
        label: t('browsePools.tableHeaders.ticker'),
        tooltipText: t('browsePools.tooltips.ticker'),
      },
    }),
    [t]
  );

  const { analytics } = useOutsideHandles();
  const headers: TableHeaders[] = config.columns.map((column) => ({
    ...tableHeaderTranslations[column],
    value: column,
  }));

  const onSortChange = (field: SortField) => {
    const inverseOrder = activeSort?.order === 'asc' ? 'desc' : 'asc';
    const order = field !== activeSort?.field ? getDefaultSortOrderByField(field) : inverseOrder;

    analytics.sendEventToPostHog(analyticsActionsMap[field]);
    setActiveSort({ field, order });
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
