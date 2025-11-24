import React from 'react';
import { Cardano } from '@cardano-sdk/core';
import { Ellipsis } from '@lace/common';
import { StatusLogo } from '@ui/components/StakePoolStatusLogo';
import styles from './StakePoolNameBrowser.module.scss';
import { TranslationsFor } from '@wallet/util/types';

export interface StakePoolNameBrowserProps {
  /** Stake pool name from metadata */
  name?: string;
  /** Stake pool ticker from metadata */
  ticker?: string;
  /** Stake pool logo from metadata */
  logo?: string;
  /** Stake pool id*/
  id?: string;
  /** Stake pool status*/
  status?: Cardano.StakePool['status'];
  /** Whether is delegating to current pool*/
  isDelegated?: boolean;
  isOversaturated?: boolean;
  translations: TranslationsFor<'retiring' | 'retired' | 'delegating' | 'saturated'>;
}

export const StakePoolNameBrowser = ({
  logo,
  name,
  ticker,
  id,
  status,
  isDelegated,
  isOversaturated,
  translations
}: StakePoolNameBrowserProps): React.ReactElement => {
  const title = name ?? ticker ?? '-';
  const subTitle: string | React.ReactElement = ticker ?? (
    <Ellipsis className={styles.id} text={id ?? ''} beforeEllipsis={6} afterEllipsis={8} />
  );

  return (
    <div className={styles.container}>
      <img src={logo} alt="pool-logo" data-testid="stake-pool-item-logo" />
      <div className={styles.content}>
        <div className={styles.title} data-testid="stake-pool-item-name">
          {title}
        </div>
        <div className={styles.flex}>
          <p className={styles.subTitle} data-testid="stake-pool-item-ticker">
            {subTitle}
          </p>
          {status && (
            <StatusLogo
              status={status}
              isDelegated={!!isDelegated}
              isOversaturated={isOversaturated}
              className={styles.statusLogo}
              translations={translations}
            />
          )}
        </div>
      </div>
    </div>
  );
};
