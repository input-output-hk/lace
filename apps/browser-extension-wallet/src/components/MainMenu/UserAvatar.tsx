import { useWalletStore } from '@stores';
import React, { VFC } from 'react';
import styles from './UserAvatar.module.scss';

export const UserAvatar: VFC = () => {
  const {
    walletInfo: { name }
  } = useWalletStore();

  return (
    <div className={styles.root}>
      <span className={styles.letter}>{name[0]}</span>
    </div>
  );
};
