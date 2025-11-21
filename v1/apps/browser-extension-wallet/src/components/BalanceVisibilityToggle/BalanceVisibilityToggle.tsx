import React, { useCallback } from 'react';
import { useWalletStore } from '@src/stores';
import EyeIcon from '@assets/icons/browser-view/eye-icon.component.svg';
import EyeIconInvisible from '@assets/icons/browser-view/eye-icon-invisible.component.svg';
import styles from './BalanceVisibilityToggle.modules.scss';

export interface BalanceVisibilityToggle {
  forceVisible?: boolean;
}

export const BalanceVisibilityToggle = (): React.ReactElement => {
  const {
    setBalancesVisibility,
    walletUI: { areBalancesVisible, canManageBalancesVisibility }
  } = useWalletStore();

  const toggleBalanceVisibility = useCallback(() => {
    if (canManageBalancesVisibility) setBalancesVisibility(!areBalancesVisible);
  }, [areBalancesVisible, canManageBalancesVisibility, setBalancesVisibility]);

  return (
    <span className={styles.iconWrapper} onClick={toggleBalanceVisibility}>
      {areBalancesVisible ? (
        <EyeIconInvisible className={styles.icon} data-testid="closed-eye-icon" />
      ) : (
        <EyeIcon className={styles.icon} data-testid="opened-eye-icon" />
      )}
    </span>
  );
};
