import { Ellipsis } from '@lace/common';
import cn from 'classnames';
import React from 'react';
import styles from './StakePoolInfo.module.scss';

export const StakePoolInfo = ({
  logo,
  name,
  ticker,
  id,
  onClick,
  popupView,
}: {
  logo: string;
  name?: string;
  ticker?: string;
  id: string;
  onClick?: () => void;
  popupView: boolean;
}): React.ReactElement => {
  const title = name || ticker || '-';
  const subTitle: string | React.ReactElement = ticker || (
    <Ellipsis className={styles.id} text={id} beforeEllipsis={6} afterEllipsis={8} />
  );

  return (
    <div
      data-testid="staking-pool-info"
      onClick={onClick}
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      className={cn(styles.stakePool, { [styles.popupView!]: popupView })}
    >
      <img className={styles.logo} src={logo} alt="pool-logo" data-testid="stake-pool-logo" />
      <div className={styles.body}>
        <div className={styles.title} data-testid="stake-pool-name">
          <div>{title}</div>
        </div>
        <div className={styles.subTitle} data-testid="stake-pool-ticker">
          <div>{subTitle}</div>
        </div>
      </div>
    </div>
  );
};
