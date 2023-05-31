/* eslint-disable no-magic-numbers */
import React from 'react';
import cn from 'classnames';
import { Ellipsis } from '@lace/common';
import styles from './StakePoolItemBrowser.module.scss';
import isNil from 'lodash/isNil';

export interface StakePoolItemBrowserProps {
  id: string;
  name?: string;
  ticker?: string;
  apy?: number | string;
  saturation?: number | string;
  cost?: number | string;
  logo: string;
  onClick?: (id: StakePoolItemBrowserProps['id']) => unknown;
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
  name,
  ticker,
  saturation,
  logo,
  apy,
  cost,
  onClick
}: StakePoolItemBrowserProps): React.ReactElement => {
  let title = name;
  let subTitle: string | React.ReactElement = ticker || '-';
  if (!name) {
    title = ticker || '-';
    subTitle = <Ellipsis className={styles.id} text={id} beforeEllipsis={6} afterEllipsis={8} />;
  }

  return (
    <div data-testid="stake-pool-table-item" className={styles.row} onClick={() => onClick(id)}>
      <div className={styles.name}>
        <img data-testid="stake-pool-list-logo" src={logo} alt="" className={styles.image} />
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
      <div className={styles.cost}>
        <p data-testid="stake-pool-list-cost">{cost}</p>
      </div>
      <div>
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
    </div>
  );
};
