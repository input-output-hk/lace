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
import laceLogoBeta from '@assets/branding/lace-logo-beta.svg';
import laceLogoBetaDark from '@assets/branding/lace-logo-beta-dark.svg';
import LaceLogoMark from '@assets/branding/lace-logo-mark.component.svg';
import LaceBetaLogoMark from '@assets/branding/lace-logo-beta-white.component.svg';
import LaceBetaDarkLogoMark from '@assets/branding/lace-logo-beta-dark.component.svg';
import styles from './LeftSidePanel.module.scss';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';

export interface VerticalNavigationBarProps {
  theme: string;
}

const CARDANO_LACE = 'lace';
const BITCOIN_LACE = 'lace-bitcoin';

type LaceMode = typeof CARDANO_LACE | typeof BITCOIN_LACE;

const logoExtended: Record<string, Record<LaceMode, string>> = {
  dark: {
    [CARDANO_LACE]: laceLogoDarkMode,
    [BITCOIN_LACE]: laceLogoBetaDark
  },
  light: {
    [CARDANO_LACE]: laceLogo,
    [BITCOIN_LACE]: laceLogoBeta
  }
};

const logoMark: Record<string, string> = {
  dark: LaceBetaDarkLogoMark,
  light: LaceBetaLogoMark
};

export const LeftSidePanel = ({ theme }: VerticalNavigationBarProps): React.ReactElement => {
  const [mode, setMode] = useState<LaceMode>(CARDANO_LACE);
  const backgroundService = useBackgroundServiceAPIContext();

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

  const getWalletMode = async () => {
    const { activeBlockchain } = await backgroundService.getBackgroundStorage();
    setMode(activeBlockchain === 'bitcoin' ? BITCOIN_LACE : CARDANO_LACE);
  };

  getWalletMode();

  const LaceLogo = mode === BITCOIN_LACE ? logoMark[theme] : LaceLogoMark;

  const logo = isNarrowWindow ? (
    <LaceLogo
      onMouseOver={handleLogoMouseEnter}
      onMouseLeave={handleLogoMouseLeave}
      className={styles.shortenedLogo}
      onClick={handleLogoRedirection}
    />
  ) : (
    <img
      className={styles.logo}
      src={logoExtended[theme][mode]}
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
            {!isNarrowWindow && (
              <div className={styles.networkPillBox}>
                <NetworkPill />
              </div>
            )}
          </div>
          <SideMenu />
        </div>
      </nav>
    </>
  );
};
