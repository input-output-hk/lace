import React, { useCallback } from 'react';
import classnames from 'classnames';
import { useWalletStore } from '@src/stores';
import { Menu, Tooltip as AntdTooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from '../DropdownMenuOverlay.module.scss';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { addEllipsis, toast, useObservable } from '@lace/common';
import { WalletStatusContainer } from '@components/WalletStatus';
import { UserAvatar } from './UserAvatar';
import { useGetHandles, useWalletAvatar, useWalletManager } from '@hooks';
import {useAnalyticsContext, useBackgroundServiceAPIContext} from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { ProfileDropdown } from '@input-output-hk/lace-ui-toolkit';
import { AnyBip32Wallet, AnyWallet, Bip32WalletAccount, ScriptWallet, WalletType } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { Separator } from './Separator';
import { getUiWalletType } from '@src/utils/get-ui-wallet-type';
import { BitcoinWallet } from '@lace/bitcoin';

const ADRESS_FIRST_PART_LENGTH = 10;
const ADRESS_LAST_PART_LENGTH = 5;
const WALLET_NAME_MAX_LENGTH = 16;
const WALLET_OPTION_NAME_MAX_LENGTH = 12;
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

interface RenderWalletOptionsParams {
  wallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>;
  lastActiveAccount?: Bip32WalletAccount<Wallet.AccountMetadata>;
}

const NO_WALLETS: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[] = [];

const shortenWalletName = (text: string, length: number) =>
  text.length > length ? `${text.slice(0, length)}...` : text;

export const UserInfo = ({ onOpenWalletAccounts, avatarVisible = true }: UserInfoProps): React.ReactElement => {
  const { t } = useTranslation();
  const { walletInfo, cardanoWallet, setIsDropdownMenuOpen } = useWalletStore();
  const { activateWallet, walletRepository, bitcoinWallet, bitcoinWalletManager } = useWalletManager();
  const analytics = useAnalyticsContext();
  const wallets = useObservable(walletRepository.wallets$, NO_WALLETS);
  const activeBitcoinWallet = useObservable(bitcoinWalletManager.activeWalletId$);
  const bitcoinBalance = useObservable(bitcoinWallet.balance$, BigInt(0));
  const walletAddress = walletInfo.addresses[0].address.toString();
  const shortenedWalletAddress = addEllipsis(walletAddress, ADRESS_FIRST_PART_LENGTH, ADRESS_LAST_PART_LENGTH);
  const fullWalletName = cardanoWallet.source.wallet.metadata.name || '';
  const activeWalletName = addEllipsis(fullWalletName, WALLET_NAME_MAX_LENGTH, 0);
  const [handle] = useGetHandles();
  const { activeWalletAvatar, getAvatar } = useWalletAvatar();
  const backgroundServices = useBackgroundServiceAPIContext();
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

  const renderWalletOption = useCallback(
    ({ wallet, lastActiveAccount }: RenderWalletOptionsParams) => {
      const walletAvatar = getAvatar(wallet.walletId);

      return (
        <div>
          <ProfileDropdown.WalletOption
            key={wallet.walletId}
            title={shortenWalletName(wallet.metadata.name, WALLET_OPTION_NAME_MAX_LENGTH)}
            subtitle={shortenWalletName(
              lastActiveAccount?.metadata.name || t('sharedWallets.userInfo.label'),
              WALLET_OPTION_NAME_MAX_LENGTH
            )}
            id={`wallet-option-${wallet.walletId}`}
            onClick={async () => {
              const { activeBlockchain } = await backgroundServices.getBackgroundStorage();
              const activeWalletId = activeBlockchain === 'bitcoin' ? activeBitcoinWallet.walletId : cardanoWallet.source.wallet.walletId;

              if (activeWalletId === wallet.walletId) {
                return;
              }
              analytics.sendEventToPostHog(PostHogAction.MultiWalletSwitchWallet);

              await activateWallet({
                walletId: wallet.walletId,
                ...(lastActiveAccount && { accountIndex: lastActiveAccount.accountIndex })
              });
              setIsDropdownMenuOpen(false);
              toast.notify({
                duration: TOAST_DEFAULT_DURATION,
                text: t('multiWallet.activated.wallet', { walletName: wallet.metadata.name })
              });

              window.location.reload();
            }}
            type={getUiWalletType(wallet.type)}
            profile={
              walletAvatar
                ? {
                    fallbackText: fullWalletName,
                    imageSrc: walletAvatar
                  }
                : undefined
            }
            {...(wallet.type !== WalletType.Script && {
              onOpenAccountsMenu: () => onOpenWalletAccounts(wallet)
            })}
          />
        </div>
      );
    },
    [
      activateWallet,
      analytics,
      fullWalletName,
      getAvatar,
      onOpenWalletAccounts,
      setIsDropdownMenuOpen,
      backgroundServices,
      t
    ]
  );

  const renderScriptWallet = useCallback(
    (wallet: ScriptWallet<Wallet.WalletMetadata>) => renderWalletOption({ wallet }),
    [renderWalletOption]
  );

  const renderBip32Wallet = useCallback(
    (wallet: AnyBip32Wallet<Wallet.WalletMetadata, Wallet.AccountMetadata>) =>
      renderWalletOption({ wallet, lastActiveAccount: getLastActiveAccount(wallet) }),
    [getLastActiveAccount, renderWalletOption]
  );

  const renderWallet = useCallback(
    (wallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>, isLast: boolean) => (
      <div key={wallet.walletId}>
        {wallet.type === WalletType.Script ? renderScriptWallet(wallet) : renderBip32Wallet(wallet)}
        {wallet.walletId === cardanoWallet?.source.wallet.walletId ? (
          <div className={styles.walletStatusInfo}>
            <WalletStatusContainer />
          </div>
        ) : undefined}
        {isLast ? undefined : <Separator />}
      </div>
    ),
    [renderScriptWallet, renderBip32Wallet, cardanoWallet?.source.wallet.walletId]
  );

  const renderBitcoinWalletOption = useCallback(() => {
      const walletAvatar = getAvatar('Bitcoin');

      return (
        <div>
          <ProfileDropdown.WalletOption
            key={'Bitcoin'}
            title={shortenWalletName('Bitcoin', WALLET_OPTION_NAME_MAX_LENGTH)}
            subtitle={shortenWalletName('Account #0', WALLET_OPTION_NAME_MAX_LENGTH)}
            id={`wallet-option-bitcoin`}
            onClick={async () => {
              setIsDropdownMenuOpen(false);
              await backgroundServices.setBackgroundStorage({
                activeBlockchain: 'bitcoin'
              });

              toast.notify({
                duration: TOAST_DEFAULT_DURATION,
                text: `Switched to Bitcoin wallet: ${bitcoinBalance.toString()} satoshis`
              });

              window.location.reload();
            }}
            type={getUiWalletType(WalletType.InMemory)}
            profile={
              walletAvatar
                ? {
                  fallbackText: fullWalletName,
                  imageSrc: walletAvatar
                }
                : undefined
            }
          />
        </div>
      );
    },
    [
      bitcoinBalance,
      fullWalletName,
      getAvatar,
      setIsDropdownMenuOpen,
      backgroundServices
    ]
  );

  const renderBitcoinWallet = useCallback(
    (_wallet: BitcoinWallet.BitcoinWallet, isLast: boolean) => (
      <div key={'Bitcoin'}>
        {renderBitcoinWalletOption()}
        {isLast ? undefined : <Separator />}
      </div>
    ),
    [renderBitcoinWalletOption]
  );

  return (
    <Menu.ItemGroup className={classnames(styles.menuItem, styles.borderBottom)} data-testid="header-menu-user-info">
      <div
        className={classnames(styles.userInfoWrapper, {
          [styles.singleWalletWrapper]: process.env.USE_MULTI_WALLET !== 'true',
          [styles.multiWalletWrapper]: process.env.USE_MULTI_WALLET === 'true'
        })}
      >
        {process.env.USE_MULTI_WALLET === 'true' ? (
          <div>
            <div>
              {wallets.map((wallet) => renderWallet(wallet, true))}
            </div>
            <div>
              {renderBitcoinWallet(bitcoinWallet, false)}
            </div>
          </div>
        ) : (
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
              <div className={styles.userInfo} onClick={handleOnAddressCopy}>
                {avatarVisible && <UserAvatar walletName={activeWalletName} avatar={activeWalletAvatar} />}
                <div className={styles.userMeta} data-testid="header-menu-user-details">
                  <p className={styles.walletName} data-testid="header-menu-wallet-name">
                    {activeWalletName}
                  </p>
                  <p className={styles.walletAddress} data-testid="header-menu-wallet-address">
                    {handleName || shortenedWalletAddress}
                  </p>
                </div>
              </div>
            </AntdTooltip>
          </CopyToClipboard>
        )}
        {process.env.USE_MULTI_WALLET === 'true' ? undefined : (
          <div className={styles.walletStatusInfo}>
            <WalletStatusContainer />
          </div>
        )}
      </div>
    </Menu.ItemGroup>
  );
};
