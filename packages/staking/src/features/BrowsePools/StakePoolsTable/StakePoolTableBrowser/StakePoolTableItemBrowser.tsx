import { PostHogAction } from '@lace/common';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../../../outside-handles-provider';
import { MAX_POOLS_COUNT, isPoolSelectedSelector, useDelegationPortfolioStore } from '../../../store';
import { TableRow } from '../Table';
import { Columns } from '../types';
import { config } from '../utils';
import { StakePoolTableItemBrowserProps } from './types';

export const StakePoolTableItemBrowser = ({
  hideSelected,
  stakePool,
  hexId,
  ...data
}: StakePoolTableItemBrowserProps & { hideSelected?: boolean }): React.ReactElement => {
  const { t } = useTranslation();
  const { analytics } = useOutsideHandles();

  const { portfolioMutators, selectionsFull, poolAlreadySelected } = useDelegationPortfolioStore((store) => ({
    poolAlreadySelected: isPoolSelectedSelector(hexId)(store),
    portfolioMutators: store.mutators,
    selectionsFull: store.selectedPortfolio.length === MAX_POOLS_COUNT,
  }));

  const onClick = () => {
    portfolioMutators.executeCommand({ data: stakePool, type: 'ShowPoolDetailsFromList' });
    analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsStakePoolDetailClick);
  };

  const onSelect = () => {
    if (poolAlreadySelected) {
      portfolioMutators.executeCommand({ data: hexId, type: 'UnselectPoolFromList' });
      analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsUnselectClick);
    } else {
      portfolioMutators.executeCommand({ data: stakePool, type: 'SelectPoolFromList' });
      analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsStakeClick);
    }
  };

  return hideSelected && poolAlreadySelected ? (
    // TODO: this would throw an error but would cause no harm for the table/proper data fetching
    <div />
  ) : (
    <TableRow<Columns>
      columns={config.columns}
      cellRenderers={config.renderer}
      data={data}
      selected={poolAlreadySelected}
      onClick={onClick}
      onSelect={onSelect}
      selectable={!selectionsFull}
      selectionDisabledMessage={t('browsePools.stakePoolTableBrowser.disabledTooltip')}
      dataTestId="stake-pool"
      withSelection
      key={data?.id}
    />
  );
};
