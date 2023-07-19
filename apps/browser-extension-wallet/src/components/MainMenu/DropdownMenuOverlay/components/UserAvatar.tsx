/* eslint-disable consistent-return */
import React from 'react';
import cn from 'classnames';
import styles from '../DropdownMenuOverlay.module.scss';
import { Image } from 'antd';
import { useGetHandles } from '@hooks';
import { getAssetImageUrl } from '@src/utils/get-asset-image-url';

interface UserAvatarProps {
  walletName: string;
  isPopup?: boolean;
}

export const UserAvatar = ({ walletName, isPopup }: UserAvatarProps): React.ReactElement => {
  const [handle] = useGetHandles();
  const handleImage = handle?.profilePic;

  return (
    <div className={cn(styles.userAvatar, { [styles.isPopup]: isPopup })} data-testid="user-avatar">
      {handleImage ? (
        <Image src={getAssetImageUrl(handleImage)} className={styles.userAvatarImage} preview={false} />
      ) : (
        <span>{walletName[0]?.toUpperCase()}</span>
      )}
    </div>
  );
};
