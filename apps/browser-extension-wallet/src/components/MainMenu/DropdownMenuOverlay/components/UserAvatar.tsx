/* eslint-disable consistent-return */
import React from 'react';
import cn from 'classnames';
import styles from '../DropdownMenuOverlay.module.scss';
import { Image } from 'antd';
import { useAdaHandle } from '@hooks';

interface UserAvatarProps {
  walletName: string;
  isPopup?: boolean;
}

export const UserAvatar = ({ walletName, isPopup }: UserAvatarProps): React.ReactElement => {
  const handle = useAdaHandle();

  return (
    <div className={cn(styles.userAvatar, { [styles.isPopup]: isPopup })} data-testid="user-avatar">
      {handle?.image ? (
        <Image src={handle?.image} className={styles.userAvatarImage} preview={false} />
      ) : (
        <span>{walletName[0]?.toUpperCase()}</span>
      )}
    </div>
  );
};
