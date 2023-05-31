import React from 'react';
import cn from 'classnames';
import { Image } from 'antd';
import styles from './DappInfo.module.scss';

export interface DappInfoProps {
  name: string;
  url: string;
  logo: string;
  fallbackLogo?: string;
  className?: string;
}

const imageSize = 40;

export const DappInfo = ({ name, url, logo, fallbackLogo, className }: DappInfoProps): React.ReactElement => (
  <div className={cn(styles.pane, className)}>
    <Image
      className={styles.logo}
      alt="dapp-logo"
      width={imageSize}
      height={imageSize}
      src={logo}
      fallback={fallbackLogo}
      preview={false}
      data-testid="dapp-info-logo"
    />
    <div className={styles.info}>
      <div className={styles.name} data-testid="dapp-info-name">
        {name}
      </div>
      <div className={styles.url} data-testid="dapp-info-url">
        {url}
      </div>
    </div>
  </div>
);
