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
  NetworkSwitcher
} from './components';
import styles from './DropdownMenuOverlay.module.scss';
import { NetworkInfo } from './components/NetworkInfo';
import { Sections } from './types';

interface Props extends MenuProps {
  isPopup?: boolean;
  lockWalletButton?: ReactNode;
  topSection?: ReactNode;
}

export const DropdownMenuOverlay: VFC<Props> = ({
  isPopup,
  lockWalletButton = <LockWallet />,
  topSection = <UserInfo />,
  ...props
}): React.ReactElement => {
  const [currentSection, setCurrentSection] = useState<Sections>(Sections.Main);

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
            <NetworkSwitcher onClick={() => setCurrentSection(Sections.NetworkInfo)} />
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
