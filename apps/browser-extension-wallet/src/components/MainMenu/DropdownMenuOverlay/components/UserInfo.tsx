import React from 'react';
import classnames from 'classnames';
import { useWalletStore } from '@src/stores';
import { Menu, Tooltip as AntdTooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from '../DropdownMenuOverlay.module.scss';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { toast, addEllipsis } from '@lace/common';
import { WalletStatusContainer } from '@components/WalletStatus';
import { UserAvatar } from './UserAvatar';
import { useGetHandles } from '@hooks';

const ADRESS_FIRST_PART_LENGTH = 10;
const ADRESS_LAST_PART_LENGTH = 5;
const WALLET_NAME_MAX_LENGTH = 16;
const TOAST_DEFAULT_DURATION = 3;

const overlayInnerStyle = {
  padding: '8px 16px',
  borderRadius: '12px',
  boxShadow: 'box-shadow: 0px 0px 16px rgba(167, 143, 160, 0.2)'
};

interface UserInfoProps {
  avatarVisible?: boolean;
}

export const UserInfo = ({ avatarVisible = true }: UserInfoProps): React.ReactElement => {
  const { t } = useTranslation();
  const { walletInfo } = useWalletStore();
  const walletAddress = walletInfo.addresses[0].address.toString();
  const shortenedWalletAddress = addEllipsis(walletAddress, ADRESS_FIRST_PART_LENGTH, ADRESS_LAST_PART_LENGTH);
  const walletName = addEllipsis(walletInfo.name.toString(), WALLET_NAME_MAX_LENGTH, 0);
  const [handle] = useGetHandles();
  const handleName = handle?.nftMetadata?.name;

  return (
    <Menu.ItemGroup className={classnames(styles.menuItem, styles.borderBottom)} data-testid="header-menu-user-info">
      <div className={styles.userInfoWrapper}>
        <CopyToClipboard text={handleName || walletAddress}>
          <AntdTooltip
            overlayInnerStyle={overlayInnerStyle}
            placement="top"
            title={
              <span className={styles.tooltip}>
                {handleName ? t('settings.copyHandle') : t('settings.copyAddress')}
              </span>
            }
          >
            <div
              className={styles.userInfo}
              onClick={() =>
                toast.notify({ duration: TOAST_DEFAULT_DURATION, text: t('general.clipboard.copiedToClipboard') })
              }
            >
              {avatarVisible && <UserAvatar walletName={walletName} />}
              <div className={styles.userMeta} data-testid="header-menu-user-details">
                <p className={styles.walletName} data-testid="header-menu-wallet-name">
                  {walletName}
                </p>
                <p className={styles.walletAddress} data-testid="header-menu-wallet-address">
                  {handleName || shortenedWalletAddress}
                </p>
              </div>
            </div>
          </AntdTooltip>
        </CopyToClipboard>
        <div className={styles.walletStatusInfo}>
          <WalletStatusContainer />
        </div>
      </div>
    </Menu.ItemGroup>
  );
};
