import React from 'react';
import styles from './AssetDrawerTitle.module.scss';
import { ImageWithFallback } from '@lace/core';

interface AssetDrawerTitleProps {
  logo: string;
  defaultLogo: string;
  title: string;
  code: string;
}

export const AssetDrawerTitle = ({ logo, defaultLogo, title, code }: AssetDrawerTitleProps): React.ReactElement => (
  <div className={styles.assetDetailsHeader} data-testid="asset-details-header">
    <ImageWithFallback src={logo} fallbackSrc={defaultLogo} alt="asset-logo" data-testid="token-logo" />
    <div className={styles.assetName}>
      <h1 data-testid="token-name">{title}</h1>
      <p data-testid="token-ticker">{code}</p>
    </div>
  </div>
);
