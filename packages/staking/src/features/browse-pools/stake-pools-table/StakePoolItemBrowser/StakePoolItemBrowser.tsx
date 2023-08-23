/* eslint-disable no-magic-numbers */
import { Wallet } from '@lace/cardano';
import { Ellipsis } from '@lace/common';
import { Button } from '@lace/ui';
import cn from 'classnames';
import isNil from 'lodash/isNil';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDelegationPortfolioStore } from '../../../store';
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
  onClick: (id: string) => unknown;
  select: () => void;
  unselect: () => void;
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

export const StakePoolItemBrowser = ({
  id,
  hexId,
  name,
  ticker,
  saturation,
  logo,
  apy,
  onClick,
  select,
  unselect,
}: StakePoolItemBrowserProps): React.ReactElement => {
  const { t } = useTranslation();
  let title = name;
  let subTitle: string | React.ReactElement = ticker || '-';
  if (!name) {
    title = ticker || '-';
    subTitle = <Ellipsis className={styles.id} text={id} beforeEllipsis={6} afterEllipsis={8} />;
  }
  const selectionsCount = useDelegationPortfolioStore((state) => state.selections.length);
  const selectionsNotEmpty = selectionsCount > 0;
  const poolAlreadySelected = useDelegationPortfolioStore((state) => state.queries.isPoolAlreadySelected(hexId));

  const StakeButtonComponent = poolAlreadySelected ? Button.Secondary : Button.CallToAction;
  const stakePoolStateLabel = poolAlreadySelected
    ? t('browsePools.stakePoolTableBrowser.unselect')
    : selectionsNotEmpty
    ? t('browsePools.stakePoolTableBrowser.addPool')
    : t('browsePools.stakePoolTableBrowser.stake');

  return (
    <div data-testid="stake-pool-table-item" className={styles.row} onClick={() => onClick(id)}>
      <div className={styles.name}>
        <img
          data-testid="stake-pool-list-logo"
          src={logo}
          alt=""
          className={cn([styles.image, poolAlreadySelected && styles.imageSelected])}
        />
        <div>
          <div>
            <h6 data-testid="stake-pool-list-name">{title}</h6>
            <p data-testid="stake-pool-list-ticker">{subTitle}</p>
          </div>
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
        <StakeButtonComponent
          label={stakePoolStateLabel}
          onClick={(event) => {
            event.stopPropagation();
            poolAlreadySelected ? unselect() : select();
          }}
          data-testid="stake-button"
        />
      </div>
    </div>
  );
};
