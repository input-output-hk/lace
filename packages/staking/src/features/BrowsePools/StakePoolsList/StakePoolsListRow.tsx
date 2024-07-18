import { Table } from '@input-output-hk/lace-ui-toolkit';
import { PostHogAction } from '@lace/common';
import { MultidelegationDAppCompatibilityModal } from 'features/modals/MultidelegationDAppCompatibilityModal';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../../outside-handles-provider';
import { MAX_POOLS_COUNT, StakePoolDetails, isPoolSelectedSelector, useDelegationPortfolioStore } from '../../store';

import { config } from './config';

export const StakePoolsListRow = ({ stakePool, hexId, id, ...data }: StakePoolDetails): React.ReactElement => {
  const { t } = useTranslation();
  const { analytics, isSharedWallet } = useOutsideHandles();

  const { portfolioMutators, selectionsFull, poolAlreadySelected } = useDelegationPortfolioStore((store) => ({
    poolAlreadySelected: isPoolSelectedSelector(hexId)(store),
    portfolioMutators: store.mutators,
    selectionsFull: store.selectedPortfolio.length === MAX_POOLS_COUNT,
  }));

  const { multidelegationDAppCompatibility, triggerMultidelegationDAppCompatibility } = useOutsideHandles();
  const [showDAppCompatibilityModal, setShowDAppCompatibilityModal] = useState(false);

  const onClick = () => {
    portfolioMutators.executeCommand({ data: stakePool, type: 'ShowPoolDetailsFromList' });
    analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsStakePoolDetailClick);
  };

  const onPoolSelect = useCallback(() => {
    if (poolAlreadySelected) {
      portfolioMutators.executeCommand({ data: hexId, type: 'UnselectPoolFromList' });
      analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsUnselectClick);
    } else {
      portfolioMutators.executeCommand({ data: [stakePool], type: 'SelectPoolFromList' });
      analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsStakeClick);
    }
  }, [analytics, hexId, poolAlreadySelected, portfolioMutators, stakePool]);

  const onDAppCompatibilityConfirm = useCallback(() => {
    triggerMultidelegationDAppCompatibility();
    onPoolSelect();
  }, [onPoolSelect, triggerMultidelegationDAppCompatibility]);

  const onSelect = useCallback(() => {
    if (multidelegationDAppCompatibility && !poolAlreadySelected && !isSharedWallet) {
      setShowDAppCompatibilityModal(true);
    } else {
      onPoolSelect();
    }
  }, [multidelegationDAppCompatibility, onPoolSelect, poolAlreadySelected, isSharedWallet]);

  return (
    <>
      <Table.Row<Omit<StakePoolDetails, 'stakePool' | 'hexId' | 'id'>>
        columns={config.columns}
        cellRenderers={config.renderer}
        data={data}
        selected={poolAlreadySelected}
        onClick={onClick}
        selectionDisabledMessage={t('browsePools.tooltips.maxNumberPoolsSelected')}
        dataTestId="stake-pool"
        withSelection={!isSharedWallet}
        keyProp={id}
        {...((!selectionsFull || poolAlreadySelected) && { onSelect })}
      />
      {showDAppCompatibilityModal && !isSharedWallet && (
        <MultidelegationDAppCompatibilityModal
          visible={multidelegationDAppCompatibility}
          onConfirm={onDAppCompatibilityConfirm}
        />
      )}
    </>
  );
};
