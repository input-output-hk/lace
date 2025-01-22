import React from 'react';
import classnames from 'classnames';
import { Ellipsis, TextAvatar, TextAvatarProps, getCapitalizedInitial } from '@lace/common';
import styles from './WalletAvatar.module.scss';

export interface WalletAvatarProps extends TextAvatarProps {
  /**
   * Avatar container styles theme
   */
  theme?: 'sideBar' | 'transparentContainer';
  /**
   * Wallet name
   */
  walletName: string;
  /**
   * Wallet address
   */
  walletAddress: string;
  /**
   * Action to be executed when clicking on the component
   */
  handleClick?: () => unknown;
  /**
   * Displays address with ellipsis or not
   */
  withoutEllipsis?: boolean;
}

export const WalletAvatar = ({
  theme,
  walletAddress,
  walletName,
  handleClick,
  withoutEllipsis,
  ...avatarProps
}: WalletAvatarProps): React.ReactElement => (
  <div
    className={classnames([theme && styles[theme], styles.avatarContainer])}
    onClick={handleClick}
    data-testid="wallet-avatar"
  >
    <TextAvatar {...avatarProps}>{getCapitalizedInitial(walletName)}</TextAvatar>
    <div data-testid="avatar-text">
      <h3 data-testid="avatar-name" className={styles.walletName}>
        {walletName}
      </h3>
      {withoutEllipsis ? (
        <p data-testid="address-without-ellipsis" className={styles.address}>
          {walletAddress}
        </p>
      ) : (
        <Ellipsis text={walletAddress} theme="address" />
      )}
    </div>
  </div>
);
