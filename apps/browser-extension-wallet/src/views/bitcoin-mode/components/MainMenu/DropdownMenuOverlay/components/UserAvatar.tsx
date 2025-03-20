/* eslint-disable consistent-return */
import React from 'react';
import cn from 'classnames';
import styles from '../DropdownMenuOverlay.module.scss';
import { Image } from 'antd';

interface UserAvatarProps {
  walletName: string;
  isPopup?: boolean;
  avatar?: string;
}

export const UserAvatar = ({ walletName, isPopup, avatar }: UserAvatarProps): React.ReactElement => (
  <div className={cn(styles.userAvatar, { [styles.isPopup]: isPopup })} data-testid="user-avatar">
    {avatar ? (
      <Image src={avatar} className={styles.userAvatarImage} preview={false} />
    ) : (
      <span>{walletName?.[0]?.toUpperCase()}</span>
    )}
  </div>
);
