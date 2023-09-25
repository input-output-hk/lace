/* eslint-disable react/no-multi-comp */
import React from 'react';
import { Switch } from '@lace/common';
import { useTranslation } from 'react-i18next';
import styles from '../DropdownMenuOverlay.module.scss';
import { useTheme } from '@providers/ThemeProvider/context';
import SunIcon from '../../../../assets/icons/sun.component.svg';
import MoonIcon from '../../../../assets/icons/moon.component.svg';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

const modeTranslate: Record<string, string> = {
  light: 'browserView.sideMenu.mode.light',
  dark: 'browserView.sideMenu.mode.dark'
};

interface Props {
  isPopup?: boolean;
}

export const ThemeSwitch = ({ isPopup }: Props): React.ReactElement => {
  const { theme, setTheme } = useTheme();
  const backgroundServices = useBackgroundServiceAPIContext();
  const analytics = useAnalyticsContext();

  const handleCurrentTheme = () => {
    const pickedTheme = theme.name === 'light' ? 'dark' : 'light';
    setTheme(pickedTheme);

    if (isPopup) {
      backgroundServices.handleChangeTheme({ theme: pickedTheme });
    }
    analytics.sendEventToPostHog(
      pickedTheme === 'light'
        ? PostHogAction.UserWalletProfileLightModeClick
        : PostHogAction.UserWalletProfileDarkModeClick
    );
  };

  return (
    <Switch
      className={styles.switch}
      checkedChildren={<SunIcon className={styles.switchIcon} />}
      unCheckedChildren={<MoonIcon className={styles.switchIcon} />}
      checked={theme.name === 'light'}
      onChange={handleCurrentTheme}
    />
  );
};

export const ThemeSwitcher = ({ isPopup }: Props): React.ReactElement => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <div className={styles.menuItemTheme} data-testid="header-menu-theme-switcher">
      {t(modeTranslate[theme.name])}
      <ThemeSwitch isPopup={isPopup} />
    </div>
  );
};
