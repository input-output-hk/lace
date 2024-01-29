import React, { useCallback } from 'react';
import classnames from 'classnames';
import { useWalletStore } from '@src/stores';
import { Menu, Tooltip as AntdTooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from '../DropdownMenuOverlay.module.scss';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { toast, addEllipsis, useObservable } from '@lace/common';
import { WalletStatusContainer } from '@components/WalletStatus';
import { UserAvatar } from './UserAvatar';
import { useGetHandles, useWalletManager } from '@hooks';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { ProfileDropdown } from '@lace/ui';
import { AnyBip32Wallet, AnyWallet, Bip32WalletAccount, WalletType } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { Separator } from './Separator';

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
  onOpenWalletAccounts?: (wallet: AnyBip32Wallet<Wallet.WalletMetadata, Wallet.AccountMetadata>) => void;
}

const NO_WALLETS: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[] = [];

export const UserInfo = ({ onOpenWalletAccounts, avatarVisible = true }: UserInfoProps): React.ReactElement => {
  const { t } = useTranslation();
  const { walletInfo, cardanoWallet } = useWalletStore();
  const { activateWallet, walletRepository } = useWalletManager();
  const analytics = useAnalyticsContext();
  const wallets = useObservable(walletRepository.wallets$, NO_WALLETS);
  const walletAddress = walletInfo.addresses[0].address.toString();
  const shortenedWalletAddress = addEllipsis(walletAddress, ADRESS_FIRST_PART_LENGTH, ADRESS_LAST_PART_LENGTH);
  const fullWalletName = cardanoWallet.source.wallet.metadata.name;
  const walletName = addEllipsis(fullWalletName, WALLET_NAME_MAX_LENGTH, 0);
  const [handle] = useGetHandles();
  const handleName = handle?.nftMetadata?.name;

  const handleOnAddressCopy = () => {
    toast.notify({ duration: TOAST_DEFAULT_DURATION, text: t('general.clipboard.copiedToClipboard') });
    analytics.sendEventToPostHog(PostHogAction.UserWalletProfileWalletAddressClick);
  };

  const getLastActiveAccount = useCallback(
    (
      wallet: AnyBip32Wallet<Wallet.WalletMetadata, Wallet.AccountMetadata>
    ): Bip32WalletAccount<Wallet.AccountMetadata> => {
      if (wallet.accounts.length === 1) return wallet.accounts[0];
      if (wallet.walletId === cardanoWallet?.source.wallet.walletId) {
        const currentlyActiveAccount = wallet.accounts.find(
          ({ accountIndex }) => accountIndex === cardanoWallet.source.account?.accountIndex
        );
        if (currentlyActiveAccount) return currentlyActiveAccount;
      }
      if (typeof wallet.metadata.lastActiveAccountIndex !== 'undefined') {
        const lastActiveAccount = wallet.accounts.find(
          ({ accountIndex }) => accountIndex === wallet.metadata.lastActiveAccountIndex
        );
        if (lastActiveAccount) return lastActiveAccount;
      }
      // If last active account is deleted, fall back to any (1st) account
      return wallet.accounts[0];
    },
    [cardanoWallet]
  );

  const renderBip32Wallet = useCallback(
    (wallet: AnyBip32Wallet<Wallet.WalletMetadata, Wallet.AccountMetadata>) => {
      const lastActiveAccount = getLastActiveAccount(wallet);
      return (
        <ProfileDropdown.WalletOption
          key={wallet.walletId}
          title={wallet.metadata.name}
          subtitle={lastActiveAccount.metadata.name}
          id={walletName}
          onOpenAccountsMenu={() => onOpenWalletAccounts(wallet)}
          onClick={() => {
            activateWallet({
              walletId: wallet.walletId,
              accountIndex: lastActiveAccount.accountIndex
            });
          }}
          type="cold"
        />
      );
    },
    [activateWallet, getLastActiveAccount, onOpenWalletAccounts, walletName]
  );

  const renderWallet = useCallback(
    (wallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>, isLast: boolean) => (
      <div>
        {wallet.type !== WalletType.Script
          ? renderBip32Wallet(wallet)
          : (() => {
              throw new Error('Script wallets are not implemented');
            })()}
        {wallet.walletId === cardanoWallet?.source.wallet.walletId ? (
          <div className={styles.walletStatusInfo}>
            <WalletStatusContainer />
          </div>
        ) : undefined}
        {isLast ? undefined : <Separator />}
      </div>
    ),
    [renderBip32Wallet, cardanoWallet?.source.wallet.walletId]
  );

  return (
    <Menu.ItemGroup className={classnames(styles.menuItem, styles.borderBottom)} data-testid="header-menu-user-info">
      <div
        className={classnames(styles.userInfoWrapper, {
          [styles.singleWalletWrapper]: process.env.USE_MULTI_WALLET !== 'true',
          [styles.multiWalletWrapper]: process.env.USE_MULTI_WALLET === 'true'
        })}
      >
        <CopyToClipboard text={handleName || walletAddress}>
          {process.env.USE_MULTI_WALLET === 'true' ? (
            <div>{wallets.map((wallet, i) => renderWallet(wallet, i === wallets.length - 1))}</div>
          ) : (
            <AntdTooltip
              overlayInnerStyle={overlayInnerStyle}
              placement="top"
              title={
                <span className={styles.tooltip}>
                  {handleName ? t('settings.copyHandle') : t('settings.copyAddress')}
                </span>
              }
            >
              <div className={styles.userInfo} onClick={handleOnAddressCopy}>
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
          )}
        </CopyToClipboard>
        {process.env.USE_MULTI_WALLET === 'true' ? undefined : (
          <div className={styles.walletStatusInfo}>
            <WalletStatusContainer />
          </div>
        )}
      </div>
    </Menu.ItemGroup>
  );
};
