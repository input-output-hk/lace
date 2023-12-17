import { Wallet } from '@lace/cardano';
import { PostHogAction } from '@lace/common';
import { Button } from '@lace/ui';
import { Tooltip } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../../../outside-handles-provider';
import { MAX_POOLS_COUNT, isPoolSelectedSelector, useDelegationPortfolioStore } from '../../../store';
import * as styles from './StakePoolItemBrowser.css';

export type MultiDelegationActionProps = {
  hexId: Wallet.Cardano.PoolIdHex;
  stakePool: Wallet.Cardano.StakePool;
};

export const MultiDelegationAction = ({ hexId, stakePool }: MultiDelegationActionProps): React.ReactElement => {
  const { t } = useTranslation();
  const { analytics } = useOutsideHandles();

  const { poolAlreadySelected, portfolioMutators, selectionsFull, selectionsNotEmpty } = useDelegationPortfolioStore(
    (store) => ({
      poolAlreadySelected: isPoolSelectedSelector(hexId)(store),
      portfolioMutators: store.mutators,
      selectionsFull: store.selectedPortfolio.length === MAX_POOLS_COUNT,
      selectionsNotEmpty: store.selectedPortfolio.length > 0,
    })
  );

  const disabledAddingToDraft = selectionsFull && !poolAlreadySelected;

  const notSelectedPoolLabel = selectionsNotEmpty
    ? t('browsePools.stakePoolTableBrowser.addPool')
    : t('browsePools.stakePoolTableBrowser.stake');
  const stakePoolStateLabel = poolAlreadySelected
    ? t('browsePools.stakePoolTableBrowser.unselect')
    : notSelectedPoolLabel;

  return (
    <div className={styles.actions}>
      <Tooltip
        title={t('browsePools.stakePoolTableBrowser.disabledTooltip')}
        trigger={disabledAddingToDraft ? 'hover' : []}
      >
        <div>
          <Button.CallToAction
            label={stakePoolStateLabel}
            onClick={(event) => {
              event.stopPropagation();
              portfolioMutators.executeCommand(
                poolAlreadySelected
                  ? {
                      data: hexId,
                      type: 'UnselectPoolFromList',
                    }
                  : {
                      data: stakePool,
                      type: 'SelectPoolFromList',
                    }
              );
              if (poolAlreadySelected) {
                analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsUnselectClick);
              } else {
                analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsStakeClick);
              }
            }}
            disabled={disabledAddingToDraft}
            data-testid="stake-button"
            size="small"
          />
        </div>
      </Tooltip>
    </div>
  );
};
