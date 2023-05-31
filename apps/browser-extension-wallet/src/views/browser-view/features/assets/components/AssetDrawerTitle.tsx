import React from 'react';
import styles from './AssetDrawerTitle.module.scss';

interface AssetDrawerTitleProps {
  logo: string;
  title: string;
  code: string;
}

export const AssetDrawerTitle = ({ logo, title, code }: AssetDrawerTitleProps): React.ReactElement => (
  <div className={styles.assetDetailsHeader} data-testid="asset-details-header">
    <img src={logo} alt="asset-logo" />
    <div className={styles.assetName} data-testid="asset-name">
      <h1>{title}</h1>
      <p>{code}</p>
    </div>
  </div>
);
