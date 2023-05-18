import React, { useState } from 'react';
import classnames from 'classnames';
import { useHistory } from 'react-router';
import { walletRoutePaths } from '@routes';
import { NetworkPill } from '../../../../components/NetworkPill';
import { SideMenu } from '../SideMenu';
import { useIsSmallerScreenWidthThan } from '@hooks/useIsSmallerScreenWidthThan';
import { BREAKPOINT_XSMALL } from '@src/styles/constants';
import laceLogo from '../../../../assets/branding/lace-logo.svg';
import laceLogoDarkMode from '../../../../assets/branding/lace-logo-dark-mode.svg';
import LaceLogoMark from '../../../../assets/branding/lace-logo-mark.component.svg';
import styles from './VerticalNavigationBar.module.scss';

export interface VerticalNavigationBarProps {
  theme: string;
}

const logoExtended: Record<string, string> = {
  dark: laceLogoDarkMode,
  light: laceLogo
};

export const VerticalNavigationBar = ({ theme }: VerticalNavigationBarProps): React.ReactElement => {
  const history = useHistory();
  const isSmallerVersion = useIsSmallerScreenWidthThan(BREAKPOINT_XSMALL);
  const [isFullWidthMenu, setIsFullWidthMenu] = useState(false);

  const logo = isSmallerVersion ? (
    <LaceLogoMark className={styles.shortenedLogo} onClick={() => history.push(walletRoutePaths.assets)} />
  ) : (
    <img
      className={styles.logo}
      src={logoExtended[theme]}
      alt="LACE"
      data-testid="header-logo"
      onClick={() => history.push(walletRoutePaths.assets)}
    />
  );

  return (
    <nav id="nav" className={classnames(styles.navigation, { [styles.navigationShadow]: isFullWidthMenu })}>
      <div className={styles.stickyMenuInner}>
        <div className={styles.logoContainer}>
          {logo}
          {isSmallerVersion ? (
            <div className={styles.networkPillContainer}>
              <NetworkPill isExpandablePill />
            </div>
          ) : (
            <NetworkPill />
          )}
        </div>
        {isSmallerVersion ? (
          <div
            onMouseEnter={() => setIsFullWidthMenu(true)}
            onMouseLeave={() => setIsFullWidthMenu(false)}
            className={styles.smallMenuContainer}
          >
            <SideMenu isFullWidthMenu={isFullWidthMenu} />
          </div>
        ) : (
          <SideMenu />
        )}
      </div>
    </nav>
  );
};
