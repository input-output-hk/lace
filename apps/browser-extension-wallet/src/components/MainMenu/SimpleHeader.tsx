import React from 'react';
import styles from './MainHeader.module.scss';
import laceLogoMark from '@src/assets/branding/lace-logo-mark.svg';
import { BetaPill } from '@src/features/dapp';

interface SimpleHeaderProps {
  showBetaPill?: boolean;
}

export const SimpleHeader = ({ showBetaPill = false }: SimpleHeaderProps): React.ReactElement => (
  <div className={styles.header} data-testid="header-container">
    <div className={styles.content}>
      <div className={styles.linkLogo}>
        <img className={styles.logo} src={laceLogoMark} alt="LACE" data-testid="header-logo" />
      </div>
      {showBetaPill && <BetaPill />}
    </div>
  </div>
);
