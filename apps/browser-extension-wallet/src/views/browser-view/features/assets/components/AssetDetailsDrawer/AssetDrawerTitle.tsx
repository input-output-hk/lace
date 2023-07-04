import React from 'react';
import styles from './AssetDrawerTitle.module.scss';

interface AssetDrawerTitleProps {
  logo: string;
  title: string;
  code: string;
}

export const AssetDrawerTitle = ({ logo, title, code }: AssetDrawerTitleProps): React.ReactElement => (
  <div className={styles.assetDetailsHeader} data-testid="asset-details-header">
    <img src={logo} alt="asset-logo" data-testid="token-logo" />
    <div className={styles.assetName}>
      <h1 data-testid="token-name">{title}</h1>
      <p data-testid="token-ticker">{code}</p>
    </div>
  </div>
);
