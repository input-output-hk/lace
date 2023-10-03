/* eslint-disable no-magic-numbers */
import { Wallet } from '@lace/cardano';
import { Ellipsis } from '@lace/common';
import { Button } from '@lace/ui';
import { Tooltip } from 'antd';
import cn from 'classnames';
import isNil from 'lodash/isNil';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MAX_POOLS_COUNT, isPoolSelectedSelector, useDelegationPortfolioStore } from '../../../store';
import styles from './StakePoolItemBrowser.module.scss';

export interface StakePoolItemBrowserProps {
  id: string;
  hexId: Wallet.Cardano.PoolIdHex;
  name?: string;
  ticker?: string;
  apy?: number | string;
  saturation?: number | string;
  cost?: number | string;
  logo: string;
  stakePool: Wallet.Cardano.StakePool;
}

export const getSaturationLevel = (saturation: number): string => {
  let color;
  if (saturation > 110) {
    color = 'red';
  } else if (saturation > 105) {
    color = 'orange';
  } else if (saturation > 100) {
    color = 'yellow';
  } else {
    color = 'green';
  }
  return color;
};

/* eslint-disable complexity */
export const StakePoolItemBrowser = ({
  id,
  hexId,
  name,
  ticker,
  saturation,
  logo,
  apy,
  stakePool,
}: StakePoolItemBrowserProps): React.ReactElement => {
  const { t } = useTranslation();
  let title = name;
  let subTitle: string | React.ReactElement = ticker || '-';
  if (!name) {
    title = ticker || '-';
    subTitle = <Ellipsis className={styles.id} text={id} beforeEllipsis={6} afterEllipsis={8} />;
  }

  const { poolAlreadySelected, portfolioMutators, selectionsFull, selectionsNotEmpty } = useDelegationPortfolioStore(
    (store) => ({
      poolAlreadySelected: isPoolSelectedSelector(hexId)(store),
      portfolioMutators: store.mutators,
      selectionsFull: store.selectedPortfolio.length === MAX_POOLS_COUNT,
      selectionsNotEmpty: store.selectedPortfolio.length > 0,
    })
  );

  const disabledAddingToDraft = selectionsFull && !poolAlreadySelected;

  const stakePoolStateLabel = poolAlreadySelected
    ? t('browsePools.stakePoolTableBrowser.unselect')
    : selectionsNotEmpty
    ? t('browsePools.stakePoolTableBrowser.addPool')
    : t('browsePools.stakePoolTableBrowser.stake');

  return (
    <div
      data-testid="stake-pool-table-item"
      className={styles.row}
      onClick={() => portfolioMutators.executeCommand({ data: stakePool, type: 'ShowPoolDetailsFromList' })}
    >
      <div className={styles.name}>
        <img
          data-testid="stake-pool-list-logo"
          src={logo}
          alt=""
          className={cn([styles.image, poolAlreadySelected && styles.imageSelected])}
        />
        <div>
          <h6 data-testid="stake-pool-list-name">{title}</h6>
          <p data-testid="stake-pool-list-ticker">{subTitle}</p>
        </div>
      </div>
      <div className={styles.apy}>
        <p data-testid="stake-pool-list-apy">{apy ?? '-'}%</p>
      </div>
      <div className={styles.saturation}>
        <p data-testid="stake-pool-list-saturation">
          {!isNil(saturation) ? (
            <>
              <span className={cn(styles.dot, styles[getSaturationLevel(Number.parseFloat(saturation.toString()))])} />
              {saturation}%
            </>
          ) : (
            '-'
          )}
        </p>
      </div>
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
              }}
              disabled={disabledAddingToDraft}
              data-testid="stake-button"
              size="small"
            />
          </div>
        </Tooltip>
      </div>
    </div>
  );
};
