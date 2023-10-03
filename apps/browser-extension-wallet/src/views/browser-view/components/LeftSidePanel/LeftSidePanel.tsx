import React, { useState } from 'react';
import classnames from 'classnames';
import { useHistory } from 'react-router';
import { walletRoutePaths } from '@routes';
import { SideMenu } from '../SideMenu';
import { useIsSmallerScreenWidthThan } from '@hooks/useIsSmallerScreenWidthThan';
import { BREAKPOINT_XSMALL } from '@src/styles/constants';
import { NetworkPill } from '@components/NetworkPill';
import laceLogo from '@assets/branding/lace-logo.svg';
import laceLogoDarkMode from '@assets/branding/lace-logo-dark-mode.svg';
import LaceLogoMark from '@assets/branding/lace-logo-mark.component.svg';
import styles from './LeftSidePanel.module.scss';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

export interface VerticalNavigationBarProps {
  theme: string;
}

const logoExtended: Record<string, string> = {
  dark: laceLogoDarkMode,
  light: laceLogo
};

export const LeftSidePanel = ({ theme }: VerticalNavigationBarProps): React.ReactElement => {
  const history = useHistory();
  const analytics = useAnalyticsContext();
  const isNarrowWindow = useIsSmallerScreenWidthThan(BREAKPOINT_XSMALL);
  const [shouldLogoHaveNoShadow, setShouldLogoHaveNoShadow] = useState(false);

  const handleLogoRedirection = () => {
    history.push(walletRoutePaths.assets);
    analytics.sendEventToPostHog(PostHogAction.WalletLaceClick);
  };
  const handleLogoMouseEnter = () => setShouldLogoHaveNoShadow(true);
  const handleLogoMouseLeave = () => setShouldLogoHaveNoShadow(false);

  const logo = isNarrowWindow ? (
    <LaceLogoMark
      onMouseOver={handleLogoMouseEnter}
      onMouseLeave={handleLogoMouseLeave}
      className={styles.shortenedLogo}
      onClick={handleLogoRedirection}
    />
  ) : (
    <img
      className={styles.logo}
      src={logoExtended[theme]}
      alt="LACE"
      data-testid="header-logo"
      onClick={handleLogoRedirection}
    />
  );

  return (
    <>
      {isNarrowWindow && <NetworkPill isExpandable />}
      <nav id="nav" className={classnames(styles.navigation, { [styles.shadowNone]: shouldLogoHaveNoShadow })}>
        <div className={styles.stickyMenuInner}>
          <div className={styles.logoContainer}>
            {logo}
            {!isNarrowWindow && <NetworkPill />}
          </div>
          <SideMenu />
        </div>
      </nav>
    </>
  );
};
