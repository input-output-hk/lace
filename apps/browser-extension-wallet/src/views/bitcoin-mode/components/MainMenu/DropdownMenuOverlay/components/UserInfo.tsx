/* eslint-disable promise/catch-or-return,  */
import React, { useCallback, useEffect, useState } from 'react';
import classnames from 'classnames';
import { useWalletStore } from '@src/stores';
import { Menu } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from '../DropdownMenuOverlay.module.scss';
import { toast, useObservable } from '@lace/common';
import { WalletStatusContainer } from '@components/WalletStatus';
import { useWalletAvatar, useWalletManager } from '@hooks';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { ProfileDropdown } from '@input-output-hk/lace-ui-toolkit';
import { AnyBip32Wallet, AnyWallet, Bip32WalletAccount, ScriptWallet, WalletType } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { Separator } from './Separator';
import { getUiWalletType } from '@src/utils/get-ui-wallet-type';

const WALLET_OPTION_NAME_MAX_LENGTH = 12;
const TOAST_DEFAULT_DURATION = 3;

interface UserInfoProps {
  avatarVisible?: boolean;
  onOpenWalletAccounts?: (wallet: AnyBip32Wallet<Wallet.WalletMetadata, Wallet.AccountMetadata>) => void;
  onOpenEditWallet?: (wallet: AnyBip32Wallet<Wallet.WalletMetadata, Wallet.AccountMetadata>) => void;
}

interface RenderWalletOptionsParams {
  wallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>;
  lastActiveAccount?: Bip32WalletAccount<Wallet.AccountMetadata>;
}

const NO_WALLETS: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[] = [];

const shortenWalletName = (text: string, length: number) =>
  text.length > length ? `${text.slice(0, length)}...` : text;

export const UserInfo = ({ onOpenWalletAccounts, onOpenEditWallet }: UserInfoProps): React.ReactElement => {
  const { t } = useTranslation();
  const { setIsDropdownMenuOpen } = useWalletStore();
  const { activateWallet, walletRepository, getActiveWalletId, getActiveWalletAccount } = useWalletManager();
  const analytics = useAnalyticsContext();
  const wallets = useObservable(walletRepository.wallets$, NO_WALLETS);
  const [fullWalletName] = useState<string>('');
  const [activeWalletId, setActiveWalletId] = useState<string>('');
  const [lastActiveAccount, setLastActiveAccount] = useState<number>(0);
  const { getAvatar } = useWalletAvatar();

  useEffect(() => {
    getActiveWalletId().then((id) => {
      setActiveWalletId(id);
    });
  }, [getActiveWalletId]);

  useEffect(() => {
    getActiveWalletAccount().then((account) => {
      setLastActiveAccount(account ? account.accountIndex : 0);
    });
  }, [getActiveWalletAccount]);

  const getLastActiveAccount = useCallback(
    (
      wallet: AnyBip32Wallet<Wallet.WalletMetadata, Wallet.AccountMetadata>
    ): Bip32WalletAccount<Wallet.AccountMetadata> => {
      if (wallet.accounts.length === 1) return wallet.accounts[0];
      if (wallet.walletId === activeWalletId) {
        const currentlyActiveAccount = wallet.accounts.find(({ accountIndex }) => accountIndex === lastActiveAccount);
        if (currentlyActiveAccount) return currentlyActiveAccount;
      }
      if (typeof wallet.metadata.lastActiveAccountIndex !== 'undefined') {
        const acc = wallet.accounts.find(({ accountIndex }) => accountIndex === wallet.metadata.lastActiveAccountIndex);
        if (acc) return acc;
      }
      // If last active account is deleted, fall back to any (1st) account
      return wallet.accounts[0];
    },
    [lastActiveAccount, activeWalletId]
  );

  const renderWalletOption = useCallback(
    ({ wallet, lastActiveAccount: acc }: RenderWalletOptionsParams) => {
      const walletAvatar = getAvatar(wallet.walletId);

      return (
        <ProfileDropdown.WalletOption
          key={wallet.walletId}
          title={shortenWalletName(wallet.metadata.name, WALLET_OPTION_NAME_MAX_LENGTH)}
          subtitle={shortenWalletName(
            acc?.metadata.name || t('sharedWallets.userInfo.label'),
            WALLET_OPTION_NAME_MAX_LENGTH
          )}
          id={`wallet-option-${wallet.walletId}`}
          onClick={async () => {
            if (activeWalletId === wallet.walletId) {
              return;
            }

            void analytics.sendEventToPostHog(PostHogAction.MultiWalletSwitchWallet);

            await activateWallet({
              walletId: wallet.walletId,
              ...(acc && { accountIndex: acc.accountIndex })
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
          {...(wallet.type !== WalletType.Script &&
            wallet.blockchainName !== 'Bitcoin' && {
              onOpenAccountsMenu: () => onOpenWalletAccounts(wallet),
              onOpenEditWallet: () => onOpenEditWallet(wallet)
            })}
        />
      );
    },
    [
      activeWalletId,
      activateWallet,
      analytics,
      fullWalletName,
      getAvatar,
      onOpenEditWallet,
      onOpenWalletAccounts,
      setIsDropdownMenuOpen,
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
        {wallet.walletId === activeWalletId ? (
          <div className={styles.walletStatusInfo}>
            <WalletStatusContainer />
          </div>
        ) : undefined}
        {isLast ? undefined : <Separator />}
      </div>
    ),
    [renderScriptWallet, renderBip32Wallet, activeWalletId]
  );

  return (
    <Menu.ItemGroup className={classnames(styles.menuItem, styles.borderBottom)} data-testid="header-menu-user-info">
      <div
        className={classnames(styles.userInfoWrapper, {
          [styles.singleWalletWrapper]: process.env.USE_MULTI_WALLET !== 'true',
          [styles.multiWalletWrapper]: process.env.USE_MULTI_WALLET === 'true'
        })}
      >
        <div>{wallets.map((wallet) => renderWallet(wallet, true))}</div>
        {process.env.USE_MULTI_WALLET === 'true' ? undefined : (
          <div className={styles.walletStatusInfo}>
            <WalletStatusContainer />
          </div>
        )}
      </div>
    </Menu.ItemGroup>
  );
};
