import { PostHogAction } from '@lace/common';
import { Table } from '@lace/ui';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../../outside-handles-provider';
import { MAX_POOLS_COUNT, StakePoolDetails, isPoolSelectedSelector, useDelegationPortfolioStore } from '../../store';
import { config } from './config';

export const StakePoolsListRow = ({ stakePool, hexId, id, ...data }: StakePoolDetails): React.ReactElement => {
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
      portfolioMutators.executeCommand({ data: [stakePool], type: 'SelectPoolFromList' });
      analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsStakeClick);
    }
  };

  return (
    <Table.Row<Omit<StakePoolDetails, 'stakePool' | 'hexId' | 'id'>>
      columns={config.columns}
      cellRenderers={config.renderer}
      data={data}
      selected={poolAlreadySelected}
      onClick={onClick}
      selectionDisabledMessage={t('browsePools.stakePoolTableBrowser.disabledTooltip')}
      dataTestId="stake-pool"
      withSelection
      keyProp={id}
      {...((!selectionsFull || poolAlreadySelected) && { onSelect })}
    />
  );
};
