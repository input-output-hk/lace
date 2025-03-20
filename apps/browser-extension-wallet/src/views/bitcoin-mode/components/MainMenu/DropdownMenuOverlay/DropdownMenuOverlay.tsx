import React, { ReactNode, useCallback, useState, VFC, useMemo } from 'react';
import { Menu, MenuProps } from 'antd';
import {
  AddNewWalletLink,
  Links,
  LockWallet,
  NetworkChoise,
  Separator,
  SettingsLink,
  SignMessageLink,
  ThemeSwitcher,
  UserInfo
} from './components';
import styles from './DropdownMenuOverlay.module.scss';
import { NetworkInfo } from './components/NetworkInfo';
import { Sections } from './types';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { WalletAccounts } from './components/WalletAccounts';
import { AddSharedWalletLink } from '@components/MainMenu/DropdownMenuOverlay/components/AddSharedWalletLink';
import { useWalletStore } from '@stores';
import classNames from 'classnames';
import type { AnyBip32Wallet } from '@cardano-sdk/web-extension';
import { WalletType } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';

interface Props extends MenuProps {
  isPopup?: boolean;
  lockWalletButton?: ReactNode;
  topSection?: ReactNode;
  sendAnalyticsEvent?: (event: PostHogAction) => void;
}

// eslint-disable-next-line complexity
export const DropdownMenuOverlay: VFC<Props> = ({
  isPopup,
  lockWalletButton = <LockWallet />,
  topSection,
  sendAnalyticsEvent,
  ...props
}): React.ReactElement => {
  const posthog = usePostHogClientContext();
  const sharedWalletsEnabled = posthog?.isFeatureFlagEnabled('shared-wallets');
  const [currentSection, setCurrentSection] = useState<Sections>(Sections.Main);
  const { environmentName, setManageAccountsWallet, walletType, isSharedWallet, isHardwareWallet } = useWalletStore();

  const openWalletAccounts = (wallet: AnyBip32Wallet<Wallet.WalletMetadata, Wallet.AccountMetadata>) => {
    setManageAccountsWallet(wallet);
    setCurrentSection(Sections.WalletAccounts);
  };

  const handleNetworkChoise = () => {
    setCurrentSection(Sections.NetworkInfo);
    sendAnalyticsEvent(PostHogAction.UserWalletProfileNetworkClick);
  };

  const goBackToMainSection = useCallback(() => setCurrentSection(Sections.Main), []);

  topSection = topSection ?? <UserInfo onOpenWalletAccounts={openWalletAccounts} />;

  const getSignMessageLink = () => (
    <>
      <SignMessageLink />
      <Separator />
    </>
  );

  const shouldShowSignMessage = useMemo(
    () =>
      process.env.USE_MESSAGE_SIGNING === 'true' &&
      !isPopup &&
      [WalletType.InMemory, WalletType.Ledger].includes(walletType),
    [isPopup, walletType]
  );

  const showAddSharedWalletLink = sharedWalletsEnabled && !isSharedWallet && !isHardwareWallet;

  return (
    <Menu {...props} className={styles.menuOverlay} data-testid="header-menu">
      {currentSection === Sections.Main && (
        <div
          className={classNames(
            isPopup ? styles.popUpContainer : styles.extendedContainer,
            environmentName === 'Mainnet' ? styles.popUpContainerHigher : styles.popUpContainerLower
          )}
        >
          {topSection}
          <Links>
            {process.env.USE_MULTI_WALLET === 'true' && (
              <AddNewWalletLink isPopup={isPopup} sendAnalyticsEvent={sendAnalyticsEvent} />
            )}
            {showAddSharedWalletLink && <AddSharedWalletLink isPopup={isPopup} />}
            <SettingsLink />
            <Separator />
            {shouldShowSignMessage && getSignMessageLink()}
            <ThemeSwitcher isPopup={isPopup} />
            <NetworkChoise onClick={handleNetworkChoise} />
            {lockWalletButton && (
              <>
                <Separator /> {lockWalletButton}
              </>
            )}
          </Links>
        </div>
      )}
      {currentSection === Sections.NetworkInfo && <NetworkInfo onBack={goBackToMainSection} />}
      {currentSection === Sections.WalletAccounts && <WalletAccounts onBack={goBackToMainSection} isPopup={isPopup} />}
    </Menu>
  );
};
