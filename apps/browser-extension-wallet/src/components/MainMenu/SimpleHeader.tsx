import React from 'react';
import styles from './MainHeader.module.scss';
import laceLogoMark from '@src/assets/branding/lace-logo-mark.svg';

export const SimpleHeader = (): React.ReactElement => (
  <div className={styles.header} data-testid="header-container">
    <div className={styles.content}>
      <div className={styles.linkLogo}>
        <img className={styles.logo} src={laceLogoMark} alt="LACE" data-testid="header-logo" />
      </div>
    </div>
  </div>
);
