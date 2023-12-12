import React, { ReactNode, useState, VFC } from 'react';
import { Menu, MenuProps } from 'antd';
import {
  AddNewWalletLink,
  AddressBookLink,
  Links,
  LockWallet,
  NetworkChoise,
  Separator,
  SettingsLink,
  ThemeSwitcher,
  UserInfo
} from './components';
import styles from './DropdownMenuOverlay.module.scss';
import { NetworkInfo } from './components/NetworkInfo';
import { Sections } from './types';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { WalletAccounts } from './components/WalletAccounts';

interface Props extends MenuProps {
  isPopup?: boolean;
  lockWalletButton?: ReactNode;
  topSection?: ReactNode;
  sendAnalyticsEvent?: (event: PostHogAction) => void;
}

export const DropdownMenuOverlay: VFC<Props> = ({
  isPopup,
  lockWalletButton = <LockWallet />,
  topSection,
  sendAnalyticsEvent,
  ...props
}): React.ReactElement => {
  const [currentSection, setCurrentSection] = useState<Sections>(Sections.Main);

  const openWalletAccounts = () => {
    setCurrentSection(Sections.WalletAccounts);
  };

  const handleNetworkChoise = () => {
    setCurrentSection(Sections.NetworkInfo);
    sendAnalyticsEvent(PostHogAction.UserWalletProfileNetworkClick);
  };

  topSection = topSection ?? <UserInfo onOpenWalletAccounts={openWalletAccounts} />;

  return (
    <Menu {...props} className={styles.menuOverlay} data-testid="header-menu">
      {currentSection === Sections.Main && (
        <div className={isPopup ? styles.popUpContainer : styles.extendedContainer}>
          {topSection}
          <Links>
            {process.env.USE_MULTI_WALLET === 'true' && <AddNewWalletLink isPopup={isPopup} />}
            <AddressBookLink isPopup={isPopup} />
            <SettingsLink />
            <Separator />
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
      {currentSection === Sections.NetworkInfo && <NetworkInfo onBack={() => setCurrentSection(Sections.Main)} />}
      {currentSection === Sections.WalletAccounts && (
        <WalletAccounts onBack={() => setCurrentSection(Sections.Main)} isPopup={isPopup} />
      )}
    </Menu>
  );
};
