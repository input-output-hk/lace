import React, { ReactNode, VFC, useState } from 'react';
import { Menu, MenuProps } from 'antd';
import {
  Separator,
  Links,
  AddressBookLink,
  SettingsLink,
  ThemeSwitcher,
  LockWallet,
  UserInfo,
  NetworkChoise
} from './components';
import styles from './DropdownMenuOverlay.module.scss';
import { NetworkInfo } from './components/NetworkInfo';
import { Sections } from './types';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

interface Props extends MenuProps {
  isPopup?: boolean;
  lockWalletButton?: ReactNode;
  topSection?: ReactNode;
  sendAnalyticsEvent?: (event: PostHogAction) => void;
}

export const DropdownMenuOverlay: VFC<Props> = ({
  isPopup,
  lockWalletButton = <LockWallet />,
  topSection = <UserInfo />,
  sendAnalyticsEvent,
  ...props
}): React.ReactElement => {
  const [currentSection, setCurrentSection] = useState<Sections>(Sections.Main);

  const handleNetworkChoise = () => {
    setCurrentSection(Sections.NetworkInfo);
    sendAnalyticsEvent(PostHogAction.UserWalletProfileNetworkClick);
  };

  return (
    <Menu {...props} className={styles.menuOverlay} data-testid="header-menu">
      {currentSection === Sections.Main && (
        <>
          {topSection}
          <Links>
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
        </>
      )}
      {currentSection === Sections.NetworkInfo && <NetworkInfo onBack={() => setCurrentSection(Sections.Main)} />}
    </Menu>
  );
};
