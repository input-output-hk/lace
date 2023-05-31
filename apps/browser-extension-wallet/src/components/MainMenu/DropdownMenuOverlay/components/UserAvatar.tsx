import React from 'react';
import cn from 'classnames';
import styles from '../DropdownMenuOverlay.module.scss';

export const UserAvatar = ({ walletName, isPopup }: { walletName: string; isPopup?: boolean }): React.ReactElement => (
  <div className={cn(styles.userAvatar, { [styles.isPopup]: isPopup })} data-testid="user-avatar">
    <span>{walletName[0]?.toUpperCase()}</span>
  </div>
);
